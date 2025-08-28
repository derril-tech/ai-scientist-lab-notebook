'use client'

import Link from 'next/link'
import { DocumentTextIcon, EyeIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface DocumentCardProps {
    document: {
        id: string
        title: string
        filename: string
        status: string
        created_at: string
        file_size?: number
    }
}

export function DocumentCard({ document }: DocumentCardProps) {
    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'Unknown'
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'processing':
                return 'text-yellow-600 bg-yellow-100'
            case 'completed':
                return 'text-green-600 bg-green-100'
            case 'failed':
                return 'text-red-600 bg-red-100'
            default:
                return 'text-gray-600 bg-gray-100'
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                            {document.title || document.filename}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">{document.filename}</p>
                    </div>
                </div>

                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                    {document.status}
                </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{formatFileSize(document.file_size)}</span>
                <span>{new Date(document.created_at).toLocaleDateString()}</span>
            </div>

            <div className="mt-3 flex space-x-2">
                <Link
                    href={`/documents/${document.id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <EyeIcon className="h-3 w-3 mr-1" />
                    View
                </Link>

                <button
                    className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    title="Reparse document"
                >
                    <ArrowPathIcon className="h-3 w-3" />
                </button>
            </div>
        </div>
    )
}
