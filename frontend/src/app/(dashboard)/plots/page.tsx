'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plotsApi, datasetsApi } from '@/lib/api'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PlotBuilder } from '@/components/plots/plot-builder'
import { PlotCard } from '@/components/plots/plot-card'
import { toast } from 'react-hot-toast'

export default function PlotsPage() {
    const [showBuilder, setShowBuilder] = useState(false)
    const queryClient = useQueryClient()

    const { data: plots, isLoading: plotsLoading } = useQuery({
        queryKey: ['plots'],
        queryFn: () => plotsApi.list(),
    })

    const { data: datasets } = useQuery({
        queryKey: ['datasets'],
        queryFn: () => datasetsApi.list(),
    })

    const createPlotMutation = useMutation({
        mutationFn: plotsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plots'] })
            toast.success('Plot created successfully!')
            setShowBuilder(false)
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create plot')
        },
    })

    const handleCreatePlot = (plotSpec: any) => {
        createPlotMutation.mutate(plotSpec)
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Plots & Visualizations</h1>
                            <p className="text-gray-600 mt-2">
                                Create and manage data visualizations from your datasets.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowBuilder(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Create Plot
                        </button>
                    </div>
                </div>

                {/* Plot Builder Modal */}
                {showBuilder && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">Create New Plot</h3>
                                        <button
                                            onClick={() => setShowBuilder(false)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <span className="sr-only">Close</span>
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <PlotBuilder
                                        datasets={datasets?.data || []}
                                        onSubmit={handleCreatePlot}
                                        onCancel={() => setShowBuilder(false)}
                                        isLoading={createPlotMutation.isPending}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Plots Grid */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Plots</h2>

                    {plotsLoading ? (
                        <div className="text-gray-500">Loading plots...</div>
                    ) : plots?.plots?.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plots.plots.map((plot: any) => (
                                <PlotCard key={plot.id} plot={plot} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-gray-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No plots yet</h3>
                            <p className="text-gray-500 mb-4">
                                Create your first plot to visualize your data.
                            </p>
                            <button
                                onClick={() => setShowBuilder(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Create Plot
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
