'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { qaApi } from '@/lib/api'
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon,
    EyeIcon,
    EyeSlashIcon
} from '@heroicons/react/24/outline'

interface AnswerPanelProps {
    answer: {
        id: string
        answer: string
        confidence: number
        reasoning: string
        created_at: string
    }
}

export function AnswerPanel({ answer }: AnswerPanelProps) {
    const [showCitations, setShowCitations] = useState(true)

    const { data: citations } = useQuery({
        queryKey: ['citations', answer.id],
        queryFn: () => qaApi.getCitations(answer.id),
        enabled: !!answer.id,
    })

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-600 bg-green-100'
        if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
        return 'text-red-600 bg-red-100'
    }

    const getConfidenceIcon = (confidence: number) => {
        if (confidence >= 0.8) return <CheckCircleIcon className="h-5 w-5 text-green-500" />
        if (confidence >= 0.6) return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
    }

    return (
        <div className="bg-white shadow rounded-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {getConfidenceIcon(answer.confidence)}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Answer</h3>
                            <p className="text-sm text-gray-500">
                                Generated on {new Date(answer.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(answer.confidence)}`}>
                        {(answer.confidence * 100).toFixed(0)}% confidence
                    </span>
                </div>
            </div>

            {/* Answer Content */}
            <div className="px-6 py-4">
                <div className="prose max-w-none">
                    <p className="text-gray-900 leading-relaxed">{answer.answer}</p>
                </div>

                {answer.reasoning && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Reasoning</h4>
                        <p className="text-sm text-gray-600">{answer.reasoning}</p>
                    </div>
                )}
            </div>

            {/* Citations */}
            {citations?.data && citations.data.length > 0 && (
                <div className="border-t border-gray-200">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-700">
                                Citations ({citations.data.length})
                            </h4>
                            <button
                                onClick={() => setShowCitations(!showCitations)}
                                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                            >
                                {showCitations ? (
                                    <>
                                        <EyeSlashIcon className="h-4 w-4 mr-1" />
                                        Hide
                                    </>
                                ) : (
                                    <>
                                        <EyeIcon className="h-4 w-4 mr-1" />
                                        Show
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {showCitations && (
                        <div className="px-6 py-4 space-y-3">
                            {citations.data.map((citation: any, index: number) => (
                                <div key={citation.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-shrink-0">
                                        <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900">
                                                Document {citation.document_id}
                                            </p>
                                            <span className="text-xs text-gray-500">
                                                Score: {(citation.score * 100).toFixed(1)}%
                                            </span>
                                        </div>

                                        {citation.page && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Page {citation.page}
                                            </p>
                                        )}

                                        {citation.snippet && (
                                            <blockquote className="mt-2 text-sm text-gray-700 italic border-l-2 border-gray-300 pl-3">
                                                "{citation.snippet}"
                                            </blockquote>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
