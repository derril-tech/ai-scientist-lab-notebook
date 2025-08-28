'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { qaApi, documentsApi } from '@/lib/api'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AnswerPanel } from '@/components/qa/answer-panel'
import { RetrieverInspector } from '@/components/qa/retriever-inspector'
import { toast } from 'react-hot-toast'

export default function QAPage() {
    const [question, setQuestion] = useState('')
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])

    const { data: documents } = useQuery({
        queryKey: ['documents'],
        queryFn: () => documentsApi.list(),
    })

    const qaMutation = useMutation({
        mutationFn: (data: { question: string; documentIds?: string[] }) =>
            qaApi.ask(data.question, data.documentIds),
        onSuccess: (data) => {
            toast.success('Question submitted successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to submit question')
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!question.trim()) {
            toast.error('Please enter a question')
            return
        }

        qaMutation.mutate({
            question: question.trim(),
            documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
        })
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900">Ask Questions</h1>
                    <p className="text-gray-600 mt-2">
                        Ask questions about your documents and get AI-powered answers with citations.
                    </p>
                </div>

                {/* Question Form */}
                <div className="bg-white shadow rounded-lg p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="question" className="block text-sm font-medium text-gray-700">
                                Your Question
                            </label>
                            <textarea
                                id="question"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                rows={3}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="Ask a question about your documents..."
                                disabled={qaMutation.isPending}
                            />
                        </div>

                        {/* Document Selection */}
                        {documents?.data?.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Documents (optional - leave empty to search all)
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {documents.data.map((doc: any) => (
                                        <label key={doc.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedDocuments.includes(doc.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedDocuments([...selectedDocuments, doc.id])
                                                    } else {
                                                        setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id))
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700 truncate">
                                                {doc.title || doc.filename}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={qaMutation.isPending || !question.trim()}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {qaMutation.isPending ? 'Asking...' : 'Ask Question'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Answer Panel */}
                {qaMutation.data && (
                    <AnswerPanel answer={qaMutation.data} />
                )}

                {/* Retriever Inspector */}
                {qaMutation.data && (
                    <RetrieverInspector answerId={qaMutation.data.id} />
                )}
            </div>
        </DashboardLayout>
    )
}
