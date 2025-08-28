'use client'

import Link from 'next/link'
import { ChartBarIcon, EyeIcon, CodeBracketIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface PlotCardProps {
    plot: {
        id: string
        title: string
        plot_type: string
        data_source: string
        created_at: string
        png_data?: string
        svg_data?: string
        python_code?: string
    }
}

export function PlotCard({ plot }: PlotCardProps) {
    const getPlotTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            line: 'Line Plot',
            bar: 'Bar Chart',
            scatter: 'Scatter Plot',
            box: 'Box Plot',
            violin: 'Violin Plot',
            histogram: 'Histogram',
            heatmap: 'Heatmap',
            area: 'Area Chart',
            pie: 'Pie Chart',
        }
        return labels[type] || type
    }

    const getPlotTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            line: 'text-blue-600 bg-blue-100',
            bar: 'text-green-600 bg-green-100',
            scatter: 'text-purple-600 bg-purple-100',
            box: 'text-orange-600 bg-orange-100',
            violin: 'text-pink-600 bg-pink-100',
            histogram: 'text-indigo-600 bg-indigo-100',
            heatmap: 'text-red-600 bg-red-100',
            area: 'text-teal-600 bg-teal-100',
            pie: 'text-yellow-600 bg-yellow-100',
        }
        return colors[type] || 'text-gray-600 bg-gray-100'
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Plot Preview */}
            <div className="aspect-video bg-gray-50 flex items-center justify-center">
                {plot.png_data ? (
                    <img
                        src={`data:image/png;base64,${plot.png_data}`}
                        alt={plot.title}
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="text-center">
                        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">No preview available</p>
                    </div>
                )}
            </div>

            {/* Plot Info */}
            <div className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                            {plot.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Data source: {plot.data_source}
                        </p>
                    </div>

                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlotTypeColor(plot.plot_type)}`}>
                        {getPlotTypeLabel(plot.plot_type)}
                    </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Created {new Date(plot.created_at).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="mt-3 flex space-x-2">
                    <Link
                        href={`/plots/${plot.id}`}
                        className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <EyeIcon className="h-3 w-3 mr-1" />
                        View
                    </Link>

                    {plot.python_code && (
                        <Link
                            href={`/plots/${plot.id}/code`}
                            className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            title="View Python code"
                        >
                            <CodeBracketIcon className="h-3 w-3" />
                        </Link>
                    )}

                    {plot.png_data && (
                        <a
                            href={`data:image/png;base64,${plot.png_data}`}
                            download={`${plot.title}.png`}
                            className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            title="Download PNG"
                        >
                            <ArrowDownTrayIcon className="h-3 w-3" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    )
}
