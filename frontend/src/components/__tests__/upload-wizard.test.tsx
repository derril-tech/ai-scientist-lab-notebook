import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UploadWizard } from '../upload/upload-wizard'

// Mock the API calls
jest.mock('@/lib/api', () => ({
    documentsApi: {
        upload: jest.fn(),
    },
    datasetsApi: {
        upload: jest.fn(),
    },
}))

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    })

const renderWithQueryClient = (component: React.ReactElement) => {
    const queryClient = createTestQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            {component}
        </QueryClientProvider>
    )
}

describe('UploadWizard', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders upload area', () => {
        renderWithQueryClient(<UploadWizard />)

        expect(screen.getByText(/drag & drop files here/i)).toBeInTheDocument()
        expect(screen.getByText(/supports pdf documents and csv\/excel datasets/i)).toBeInTheDocument()
    })

    it('shows drag active state when dragging over', () => {
        renderWithQueryClient(<UploadWizard />)

        const uploadArea = screen.getByText(/drag & drop files here/i).closest('div')
        fireEvent.dragEnter(uploadArea!)

        expect(screen.getByText(/drop the files here/i)).toBeInTheDocument()
    })

    it('handles file drop for PDF document', async () => {
        const mockUpload = jest.fn().mockResolvedValue({ data: { id: 'doc-1' } })
        const { documentsApi } = require('@/lib/api')
        documentsApi.upload.mockImplementation(mockUpload)

        renderWithQueryClient(<UploadWizard />)

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
        const uploadArea = screen.getByText(/drag & drop files here/i).closest('div')

        fireEvent.drop(uploadArea!, {
            dataTransfer: {
                files: [file],
            },
        })

        await waitFor(() => {
            expect(screen.getByText('test.pdf')).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(mockUpload).toHaveBeenCalledWith(file)
        })
    })

    it('handles file drop for CSV dataset', async () => {
        const mockUpload = jest.fn().mockResolvedValue({ data: { id: 'dataset-1' } })
        const { datasetsApi } = require('@/lib/api')
        datasetsApi.upload.mockImplementation(mockUpload)

        renderWithQueryClient(<UploadWizard />)

        const file = new File(['test,data'], 'test.csv', { type: 'text/csv' })
        const uploadArea = screen.getByText(/drag & drop files here/i).closest('div')

        fireEvent.drop(uploadArea!, {
            dataTransfer: {
                files: [file],
            },
        })

        await waitFor(() => {
            expect(screen.getByText('test.csv')).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(mockUpload).toHaveBeenCalledWith(file)
        })
    })

    it('shows upload progress', async () => {
        const mockUpload = jest.fn().mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve({ data: { id: 'doc-1' } }), 100))
        )
        const { documentsApi } = require('@/lib/api')
        documentsApi.upload.mockImplementation(mockUpload)

        renderWithQueryClient(<UploadWizard />)

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
        const uploadArea = screen.getByText(/drag & drop files here/i).closest('div')

        fireEvent.drop(uploadArea!, {
            dataTransfer: {
                files: [file],
            },
        })

        await waitFor(() => {
            expect(screen.getByText('test.pdf')).toBeInTheDocument()
        })

        // Should show progress bar
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('allows removing files from upload list', async () => {
        renderWithQueryClient(<UploadWizard />)

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
        const uploadArea = screen.getByText(/drag & drop files here/i).closest('div')

        fireEvent.drop(uploadArea!, {
            dataTransfer: {
                files: [file],
            },
        })

        await waitFor(() => {
            expect(screen.getByText('test.pdf')).toBeInTheDocument()
        })

        const removeButton = screen.getByTitle(/remove/i)
        fireEvent.click(removeButton)

        await waitFor(() => {
            expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
        })
    })

    it('shows success state after upload', async () => {
        const mockUpload = jest.fn().mockResolvedValue({ data: { id: 'doc-1' } })
        const { documentsApi } = require('@/lib/api')
        documentsApi.upload.mockImplementation(mockUpload)

        renderWithQueryClient(<UploadWizard />)

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
        const uploadArea = screen.getByText(/drag & drop files here/i).closest('div')

        fireEvent.drop(uploadArea!, {
            dataTransfer: {
                files: [file],
            },
        })

        await waitFor(() => {
            expect(screen.getByText('test.pdf')).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByTestId('success-icon')).toBeInTheDocument()
        })
    })

    it('shows error state on upload failure', async () => {
        const mockUpload = jest.fn().mockRejectedValue(new Error('Upload failed'))
        const { documentsApi } = require('@/lib/api')
        documentsApi.upload.mockImplementation(mockUpload)

        renderWithQueryClient(<UploadWizard />)

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
        const uploadArea = screen.getByText(/drag & drop files here/i).closest('div')

        fireEvent.drop(uploadArea!, {
            dataTransfer: {
                files: [file],
            },
        })

        await waitFor(() => {
            expect(screen.getByText('test.pdf')).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByTestId('error-icon')).toBeInTheDocument()
        })
    })
})
