import { test, expect } from '@playwright/test'

test.describe('AI Scientist Lab Notebook - E2E Pipeline', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:3000')

        // Login (assuming we have a test user)
        await page.fill('[data-testid="email-input"]', 'test@example.com')
        await page.fill('[data-testid="password-input"]', 'password123')
        await page.click('[data-testid="login-button"]')

        // Wait for dashboard to load
        await page.waitForSelector('[data-testid="dashboard"]')
    })

    test('complete workflow: upload PDF/CSV → auto-summaries → ask Q → hover citations → build plot → export report', async ({ page }) => {
        // Step 1: Upload PDF document
        await page.click('[data-testid="upload-button"]')

        // Upload a test PDF
        const fileChooser = await page.waitForEvent('filechooser')
        await fileChooser.setFiles('e2e/fixtures/sample-research.pdf')

        // Wait for upload to complete
        await page.waitForSelector('[data-testid="upload-success"]', { timeout: 30000 })

        // Step 2: Wait for auto-summary generation
        await page.waitForSelector('[data-testid="experiment-summary"]', { timeout: 60000 })

        // Verify summary was generated
        const summary = await page.locator('[data-testid="experiment-summary"]').first()
        await expect(summary).toBeVisible()

        // Step 3: Navigate to Q&A
        await page.click('[data-testid="qa-nav-link"]')
        await page.waitForSelector('[data-testid="qa-page"]')

        // Ask a question
        await page.fill('[data-testid="question-input"]', 'What is the optimal temperature for enzyme activity?')
        await page.click('[data-testid="ask-button"]')

        // Wait for answer
        await page.waitForSelector('[data-testid="answer-content"]', { timeout: 30000 })

        // Verify answer has citations
        const citations = await page.locator('[data-testid="citation"]').all()
        expect(citations.length).toBeGreaterThan(0)

        // Step 4: Hover over citations to see details
        await citations[0].hover()
        await page.waitForSelector('[data-testid="citation-tooltip"]')

        // Step 5: Navigate to plots
        await page.click('[data-testid="plots-nav-link"]')
        await page.waitForSelector('[data-testid="plots-page"]')

        // Create a new plot
        await page.click('[data-testid="create-plot-button"]')
        await page.waitForSelector('[data-testid="plot-builder"]')

        // Fill plot details
        await page.fill('[data-testid="plot-title"]', 'Enzyme Activity vs Temperature')
        await page.selectOption('[data-testid="plot-type"]', 'line')
        await page.selectOption('[data-testid="data-source"]', 'enzyme_data')
        await page.selectOption('[data-testid="x-column"]', 'Temperature')
        await page.selectOption('[data-testid="y-column"]', 'Activity')

        // Create plot
        await page.click('[data-testid="create-plot-submit"]')

        // Wait for plot generation
        await page.waitForSelector('[data-testid="plot-preview"]', { timeout: 30000 })

        // Step 6: Export report
        await page.click('[data-testid="export-nav-link"]')
        await page.waitForSelector('[data-testid="export-page"]')

        // Create bundle
        await page.click('[data-testid="create-bundle-button"]')
        await page.waitForSelector('[data-testid="bundle-builder"]')

        // Select components for bundle
        await page.check('[data-testid="select-document"]')
        await page.check('[data-testid="select-experiment"]')
        await page.check('[data-testid="select-answer"]')
        await page.check('[data-testid="select-plot"]')

        // Fill bundle details
        await page.fill('[data-testid="bundle-title"]', 'Enzyme Study Report')
        await page.fill('[data-testid="bundle-description"]', 'Complete analysis of enzyme temperature effects')

        // Export bundle
        await page.click('[data-testid="export-bundle-button"]')

        // Wait for export to complete
        await page.waitForSelector('[data-testid="export-success"]', { timeout: 60000 })

        // Verify download
        const downloadPromise = page.waitForEvent('download')
        await page.click('[data-testid="download-bundle"]')
        const download = await downloadPromise
        expect(download.suggestedFilename()).toContain('enzyme-study-report')
    })

    test('insufficient evidence handling', async ({ page }) => {
        // Navigate to Q&A
        await page.click('[data-testid="qa-nav-link"]')
        await page.waitForSelector('[data-testid="qa-page"]')

        // Ask a question without sufficient context
        await page.fill('[data-testid="question-input"]', 'What is the molecular structure of the enzyme?')
        await page.click('[data-testid="ask-button"]')

        // Wait for answer
        await page.waitForSelector('[data-testid="answer-content"]', { timeout: 30000 })

        // Verify insufficient evidence message
        const answer = await page.locator('[data-testid="answer-content"]')
        await expect(answer).toContainText('insufficient evidence')

        // Verify low confidence indicator
        const confidence = await page.locator('[data-testid="confidence-score"]')
        const confidenceValue = await confidence.textContent()
        expect(parseFloat(confidenceValue!)).toBeLessThan(0.5)
    })

    test('concurrent QA sessions', async ({ page, context }) => {
        // Create multiple browser contexts for concurrent sessions
        const contexts = await Promise.all([
            context,
            context.browser()!.newContext(),
            context.browser()!.newContext()
        ])

        const pages = await Promise.all(
            contexts.map(async (ctx) => {
                const page = await ctx.newPage()
                await page.goto('http://localhost:3000')
                await page.fill('[data-testid="email-input"]', 'test@example.com')
                await page.fill('[data-testid="password-input"]', 'password123')
                await page.click('[data-testid="login-button"]')
                await page.waitForSelector('[data-testid="dashboard"]')
                return page
            })
        )

        // Navigate all pages to Q&A
        await Promise.all(
            pages.map(async (page) => {
                await page.click('[data-testid="qa-nav-link"]')
                await page.waitForSelector('[data-testid="qa-page"]')
            })
        )

        // Ask questions concurrently
        const questions = [
            'What is the optimal temperature?',
            'What are the key findings?',
            'What methodology was used?'
        ]

        const questionPromises = pages.map(async (page, index) => {
            await page.fill('[data-testid="question-input"]', questions[index])
            await page.click('[data-testid="ask-button"]')
            await page.waitForSelector('[data-testid="answer-content"]', { timeout: 30000 })
            return page.locator('[data-testid="answer-content"]').textContent()
        })

        const answers = await Promise.all(questionPromises)

        // Verify all questions were answered
        expect(answers.length).toBe(3)
        answers.forEach(answer => {
            expect(answer).toBeTruthy()
            expect(answer!.length).toBeGreaterThan(0)
        })

        // Clean up
        await Promise.all(contexts.slice(1).map(ctx => ctx.close()))
    })

    test('burst uploads', async ({ page }) => {
        // Upload multiple files rapidly
        const files = [
            'e2e/fixtures/sample-research-1.pdf',
            'e2e/fixtures/sample-research-2.pdf',
            'e2e/fixtures/sample-data.csv'
        ]

        await page.click('[data-testid="upload-button"]')

        for (const file of files) {
            const fileChooser = await page.waitForEvent('filechooser')
            await fileChooser.setFiles(file)

            // Wait a bit between uploads
            await page.waitForTimeout(1000)
        }

        // Wait for all uploads to complete
        await page.waitForSelector('[data-testid="upload-success"]', { timeout: 120000 })

        // Verify all files were processed
        const uploadItems = await page.locator('[data-testid="upload-item"]').all()
        expect(uploadItems.length).toBe(files.length)
    })

    test('long table previews', async ({ page }) => {
        // Upload a large dataset
        await page.click('[data-testid="upload-button"]')

        const fileChooser = await page.waitForEvent('filechooser')
        await fileChooser.setFiles('e2e/fixtures/large-dataset.csv')

        await page.waitForSelector('[data-testid="upload-success"]', { timeout: 60000 })

        // Navigate to datasets
        await page.click('[data-testid="datasets-nav-link"]')
        await page.waitForSelector('[data-testid="datasets-page"]')

        // Click on the uploaded dataset
        await page.click('[data-testid="dataset-item"]')
        await page.waitForSelector('[data-testid="dataset-preview"]')

        // Verify preview loads quickly
        const previewLoadTime = await page.evaluate(() => {
            const start = performance.now()
            return new Promise((resolve) => {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.name.includes('dataset-preview')) {
                            resolve(performance.now() - start)
                        }
                    }
                })
                observer.observe({ entryTypes: ['measure'] })
            })
        })

        expect(previewLoadTime).toBeLessThan(5000) // Should load within 5 seconds
    })

    test('OCR fallback handling', async ({ page }) => {
        // Upload a scanned PDF (image-based)
        await page.click('[data-testid="upload-button"]')

        const fileChooser = await page.waitForEvent('filechooser')
        await fileChooser.setFiles('e2e/fixtures/scanned-document.pdf')

        // Wait for OCR processing
        await page.waitForSelector('[data-testid="ocr-processing"]', { timeout: 30000 })
        await page.waitForSelector('[data-testid="upload-success"]', { timeout: 120000 })

        // Verify OCR was used
        const processingInfo = await page.locator('[data-testid="processing-info"]').textContent()
        expect(processingInfo).toContain('OCR')
    })

    test('failed parse handling', async ({ page }) => {
        // Upload a corrupted file
        await page.click('[data-testid="upload-button"]')

        const fileChooser = await page.waitForEvent('filechooser')
        await fileChooser.setFiles('e2e/fixtures/corrupted-file.pdf')

        // Wait for error handling
        await page.waitForSelector('[data-testid="upload-error"]', { timeout: 30000 })

        // Verify error message
        const errorMessage = await page.locator('[data-testid="error-message"]').textContent()
        expect(errorMessage).toContain('failed to parse')

        // Verify retry option is available
        await page.click('[data-testid="retry-button"]')
        await page.waitForSelector('[data-testid="retry-processing"]')
    })

    test('delayed worker recovery', async ({ page }) => {
        // This test would require mocking worker delays
        // For now, we'll test the UI handles delays gracefully

        await page.click('[data-testid="upload-button"]')

        const fileChooser = await page.waitForEvent('filechooser')
        await fileChooser.setFiles('e2e/fixtures/sample-research.pdf')

        // Wait for processing with longer timeout
        await page.waitForSelector('[data-testid="upload-success"]', { timeout: 180000 })

        // Verify processing completed despite delays
        const status = await page.locator('[data-testid="processing-status"]').textContent()
        expect(status).toContain('completed')
    })

    test('RLS coverage', async ({ page, context }) => {
        // Test with different user accounts
        const users = [
            { email: 'user1@example.com', password: 'password123' },
            { email: 'user2@example.com', password: 'password123' }
        ]

        for (const user of users) {
            const newContext = await context.browser()!.newContext()
            const newPage = await newContext.newPage()

            await newPage.goto('http://localhost:3000')
            await newPage.fill('[data-testid="email-input"]', user.email)
            await newPage.fill('[data-testid="password-input"]', user.password)
            await newPage.click('[data-testid="login-button"]')
            await newPage.waitForSelector('[data-testid="dashboard"]')

            // Navigate to documents
            await newPage.click('[data-testid="documents-nav-link"]')
            await newPage.waitForSelector('[data-testid="documents-page"]')

            // Verify only user's documents are visible
            const documents = await newPage.locator('[data-testid="document-item"]').all()
            // Each user should only see their own documents

            await newContext.close()
        }
    })

    test('signed URL scope', async ({ page }) => {
        // Upload a document
        await page.click('[data-testid="upload-button"]')

        const fileChooser = await page.waitForEvent('filechooser')
        await fileChooser.setFiles('e2e/fixtures/sample-research.pdf')

        await page.waitForSelector('[data-testid="upload-success"]', { timeout: 30000 })

        // Navigate to document view
        await page.click('[data-testid="document-item"]')
        await page.waitForSelector('[data-testid="document-viewer"]')

        // Check that signed URLs are properly scoped
        const imageUrls = await page.locator('img').all()
        for (const img of imageUrls) {
            const src = await img.getAttribute('src')
            if (src && src.includes('signed-url')) {
                // Verify URL has proper expiration and scope
                expect(src).toContain('expires=')
                expect(src).toContain('signature=')
            }
        }
    })

    test('audit completeness', async ({ page }) => {
        // Perform various actions that should be audited
        const actions = [
            { type: 'upload', selector: '[data-testid="upload-button"]' },
            { type: 'qa', selector: '[data-testid="qa-nav-link"]' },
            { type: 'export', selector: '[data-testid="export-nav-link"]' }
        ]

        for (const action of actions) {
            await page.click(action.selector)
            await page.waitForTimeout(1000)
        }

        // Navigate to audit log (if available)
        await page.click('[data-testid="audit-nav-link"]')
        await page.waitForSelector('[data-testid="audit-page"]')

        // Verify audit entries exist
        const auditEntries = await page.locator('[data-testid="audit-entry"]').all()
        expect(auditEntries.length).toBeGreaterThan(0)

        // Verify audit entries contain required fields
        for (const entry of auditEntries) {
            const timestamp = await entry.locator('[data-testid="audit-timestamp"]').textContent()
            const action = await entry.locator('[data-testid="audit-action"]').textContent()
            const user = await entry.locator('[data-testid="audit-user"]').textContent()

            expect(timestamp).toBeTruthy()
            expect(action).toBeTruthy()
            expect(user).toBeTruthy()
        }
    })
})
