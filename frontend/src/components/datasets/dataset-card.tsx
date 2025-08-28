'use client'

import Link from 'next/link'
import { TableCellsIcon, EyeIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface DatasetCardProps {
    dataset: {
        id: string
        name: string
        description?: string
        row_count?: number
        column_count?: number
        created_at: string
        file_size?: number
    }
}

export function DatasetCard({ dataset }: DatasetCardProps) {
    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'Unknown'
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <TableCellsIcon className="h-8 w-8 text-green-500" />
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                            {dataset.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                            {dataset.description || 'No description'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>
                    {dataset.row_count?.toLocaleString() || 'Unknown'} rows
                    {dataset.column_count && ` × ${dataset.column_count} columns`}
                </span>
                <span>{formatFileSize(dataset.file_size)}</span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>Created {new Date(dataset.created_at).toLocaleDateString()}</span>
            </div>

            <div className="mt-3 flex space-x-2">
                <Link
                    href={`/datasets/${dataset.id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <EyeIcon className="h-3 w-3 mr-1" />
                    View
                </Link>

                <Link
                    href={`/plots?dataSource=${dataset.id}`}
                    className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <ChartBarIcon className="h-3 w-3 mr-1" />
                    Plot
                </Link>
            </div>
        </div>
    )
}
