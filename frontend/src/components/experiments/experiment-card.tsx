'use client'

import Link from 'next/link'
import { BeakerIcon, EyeIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

interface ExperimentCardProps {
    experiment: {
        id: string
        title: string
        objective: string
        confidence_score: number
        created_at: string
        document_id: string
        key_findings: string[]
        limitations: string[]
    }
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
    const getConfidenceColor = (score: number) => {
        if (score >= 0.8) return 'text-green-600 bg-green-100'
        if (score >= 0.6) return 'text-yellow-600 bg-yellow-100'
        return 'text-red-600 bg-red-100'
    }

    const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength) + '...'
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <BeakerIcon className="h-8 w-8 text-purple-500" />
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                            {experiment.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {truncateText(experiment.objective, 100)}
                        </p>
                    </div>
                </div>

                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(experiment.confidence_score)}`}>
                    {(experiment.confidence_score * 100).toFixed(0)}% confidence
                </span>
            </div>

            <div className="mt-3 space-y-2">
                {experiment.key_findings.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-gray-700">Key Findings:</p>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                            {experiment.key_findings.slice(0, 2).map((finding, index) => (
                                <li key={index} className="truncate">
                                    • {truncateText(finding, 80)}
                                </li>
                            ))}
                            {experiment.key_findings.length > 2 && (
                                <li className="text-gray-500">+{experiment.key_findings.length - 2} more</li>
                            )}
                        </ul>
                    </div>
                )}

                {experiment.limitations.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-gray-700">Limitations:</p>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                            {experiment.limitations.slice(0, 1).map((limitation, index) => (
                                <li key={index} className="truncate">
                                    • {truncateText(limitation, 80)}
                                </li>
                            ))}
                            {experiment.limitations.length > 1 && (
                                <li className="text-gray-500">+{experiment.limitations.length - 1} more</li>
                            )}
                        </ul>
                    </div>
                )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>Created {new Date(experiment.created_at).toLocaleDateString()}</span>
            </div>

            <div className="mt-3 flex space-x-2">
                <Link
                    href={`/experiments/${experiment.id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <EyeIcon className="h-3 w-3 mr-1" />
                    View Details
                </Link>

                <Link
                    href={`/documents/${experiment.document_id}`}
                    className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    title="View source document"
                >
                    <DocumentTextIcon className="h-3 w-3" />
                </Link>
            </div>
        </div>
    )
}
