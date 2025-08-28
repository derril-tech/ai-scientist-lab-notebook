'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const plotSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    plotType: z.enum(['line', 'bar', 'scatter', 'box', 'violin', 'histogram', 'heatmap', 'area', 'pie']),
    dataSource: z.string().min(1, 'Data source is required'),
    xColumn: z.string().optional(),
    yColumn: z.string().optional(),
    colorColumn: z.string().optional(),
    facetColumn: z.string().optional(),
})

type PlotForm = z.infer<typeof plotSchema>

interface PlotBuilderProps {
    datasets: any[]
    onSubmit: (plotSpec: any) => void
    onCancel: () => void
    isLoading: boolean
}

export function PlotBuilder({ datasets, onSubmit, onCancel, isLoading }: PlotBuilderProps) {
    const [selectedDataset, setSelectedDataset] = useState<any>(null)

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<PlotForm>({
        resolver: zodResolver(plotSchema),
    })

    const plotType = watch('plotType')
    const dataSource = watch('dataSource')

    // Find selected dataset
    const currentDataset = datasets.find(d => d.id === dataSource)

    const plotTypes = [
        { value: 'line', label: 'Line Plot', description: 'Shows trends over time or continuous data' },
        { value: 'bar', label: 'Bar Chart', description: 'Compares categories or discrete values' },
        { value: 'scatter', label: 'Scatter Plot', description: 'Shows relationship between two variables' },
        { value: 'box', label: 'Box Plot', description: 'Shows distribution and outliers' },
        { value: 'violin', label: 'Violin Plot', description: 'Shows distribution density' },
        { value: 'histogram', label: 'Histogram', description: 'Shows frequency distribution' },
        { value: 'heatmap', label: 'Heatmap', description: 'Shows correlation matrix or 2D data' },
        { value: 'area', label: 'Area Chart', description: 'Shows cumulative data over time' },
        { value: 'pie', label: 'Pie Chart', description: 'Shows proportions of a whole' },
    ]

    const handleFormSubmit = (data: PlotForm) => {
        onSubmit({
            ...data,
            transforms: [],
            style: {},
        })
    }

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Plot Title
                    </label>
                    <input
                        {...register('title')}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Enter plot title"
                    />
                    {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="dataSource" className="block text-sm font-medium text-gray-700">
                        Data Source
                    </label>
                    <select
                        {...register('dataSource')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                        <option value="">Select a dataset</option>
                        {datasets.map((dataset) => (
                            <option key={dataset.id} value={dataset.id}>
                                {dataset.name || dataset.filename}
                            </option>
                        ))}
                    </select>
                    {errors.dataSource && (
                        <p className="mt-1 text-sm text-red-600">{errors.dataSource.message}</p>
                    )}
                </div>
            </div>

            {/* Plot Type Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Plot Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {plotTypes.map((type) => (
                        <label
                            key={type.value}
                            className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${plotType === type.value
                                    ? 'border-indigo-500 ring-2 ring-indigo-500'
                                    : 'border-gray-300'
                                }`}
                        >
                            <input
                                {...register('plotType')}
                                type="radio"
                                value={type.value}
                                className="sr-only"
                            />
                            <div className="flex flex-1">
                                <div className="flex flex-col">
                                    <span className="block text-sm font-medium text-gray-900">
                                        {type.label}
                                    </span>
                                    <span className="mt-1 flex items-center text-sm text-gray-500">
                                        {type.description}
                                    </span>
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
                {errors.plotType && (
                    <p className="mt-1 text-sm text-red-600">{errors.plotType.message}</p>
                )}
            </div>

            {/* Column Selection */}
            {currentDataset && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="xColumn" className="block text-sm font-medium text-gray-700">
                            X-Axis Column
                        </label>
                        <select
                            {...register('xColumn')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="">Select column</option>
                            {currentDataset.columns?.map((col: string) => (
                                <option key={col} value={col}>
                                    {col}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="yColumn" className="block text-sm font-medium text-gray-700">
                            Y-Axis Column
                        </label>
                        <select
                            {...register('yColumn')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="">Select column</option>
                            {currentDataset.columns?.map((col: string) => (
                                <option key={col} value={col}>
                                    {col}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="colorColumn" className="block text-sm font-medium text-gray-700">
                            Color Column (Optional)
                        </label>
                        <select
                            {...register('colorColumn')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="">Select column</option>
                            {currentDataset.columns?.map((col: string) => (
                                <option key={col} value={col}>
                                    {col}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="facetColumn" className="block text-sm font-medium text-gray-700">
                            Facet Column (Optional)
                        </label>
                        <select
                            {...register('facetColumn')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="">Select column</option>
                            {currentDataset.columns?.map((col: string) => (
                                <option key={col} value={col}>
                                    {col}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Creating...' : 'Create Plot'}
                </button>
            </div>
        </form>
    )
}
