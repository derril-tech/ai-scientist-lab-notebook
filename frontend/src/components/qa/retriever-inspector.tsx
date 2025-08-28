'use client'

import { useState } from 'react'
import {
    MagnifyingGlassIcon,
    DocumentTextIcon,
    TableCellsIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline'

interface RetrieverInspectorProps {
    answerId: string
}

export function RetrieverInspector({ answerId }: RetrieverInspectorProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    // Mock data for demonstration
    const retrievalData = {
        query: "What are the main findings?",
        retrievedChunks: [
            {
                id: "chunk-1",
                type: "text",
                content: "The study found significant improvements in performance...",
                score: 0.95,
                document: "Research Paper A",
                page: 5
            },
            {
                id: "chunk-2",
                type: "table",
                content: "Table 1: Performance metrics across different conditions",
                score: 0.87,
                document: "Research Paper A",
                page: 8
            },
            {
                id: "chunk-3",
                type: "text",
                content: "Further analysis revealed that the effect was consistent...",
                score: 0.82,
                document: "Research Paper B",
                page: 12
            }
        ],
        retrievalStats: {
            totalChunks: 150,
            retrievedChunks: 3,
            avgScore: 0.88,
            retrievalTime: 245
        }
    }

    const getChunkIcon = (type: string) => {
        switch (type) {
            case 'table':
                return <TableCellsIcon className="h-4 w-4 text-green-500" />
            case 'figure':
                return <ChartBarIcon className="h-4 w-4 text-purple-500" />
            default:
                return <DocumentTextIcon className="h-4 w-4 text-blue-500" />
        }
    }

    const getScoreColor = (score: number) => {
        if (score >= 0.9) return 'text-green-600 bg-green-100'
        if (score >= 0.7) return 'text-yellow-600 bg-yellow-100'
        return 'text-red-600 bg-red-100'
    }

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
                        <h3 className="text-lg font-medium text-gray-900">Retrieval Inspector</h3>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                        {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="px-6 py-4 space-y-4">
                    {/* Query */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Query</h4>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                            {retrievalData.query}
                        </p>
                    </div>

                    {/* Retrieval Stats */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Retrieval Statistics</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">Total Chunks</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {retrievalData.retrievalStats.totalChunks}
                                </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">Retrieved</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {retrievalData.retrievalStats.retrievedChunks}
                                </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">Avg Score</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {(retrievalData.retrievalStats.avgScore * 100).toFixed(1)}%
                                </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">Time (ms)</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {retrievalData.retrievalStats.retrievalTime}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Retrieved Chunks */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Retrieved Chunks</h4>
                        <div className="space-y-3">
                            {retrievalData.retrievedChunks.map((chunk, index) => (
                                <div key={chunk.id} className="border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-2">
                                            {getChunkIcon(chunk.type)}
                                            <span className="text-sm font-medium text-gray-900">
                                                {chunk.document} - Page {chunk.page}
                                            </span>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(chunk.score)}`}>
                                            {(chunk.score * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                        {chunk.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
