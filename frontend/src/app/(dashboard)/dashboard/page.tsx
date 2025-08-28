'use client'

import { useQuery } from '@tanstack/react-query'
import { documentsApi, datasetsApi, summariesApi } from '@/lib/api'
import { useAuthStore } from '@/providers/store-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DocumentCard } from '@/components/documents/document-card'
import { DatasetCard } from '@/components/datasets/dataset-card'
import { ExperimentCard } from '@/components/experiments/experiment-card'
import { UploadWizard } from '@/components/upload/upload-wizard'

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user)

    const { data: documents, isLoading: documentsLoading } = useQuery({
        queryKey: ['documents'],
        queryFn: () => documentsApi.list({ limit: 5 }),
    })

    const { data: datasets, isLoading: datasetsLoading } = useQuery({
        queryKey: ['datasets'],
        queryFn: () => datasetsApi.list({ limit: 5 }),
    })

    const { data: experiments, isLoading: experimentsLoading } = useQuery({
        queryKey: ['experiments'],
        queryFn: () => summariesApi.listExperiments({ limit: 5 }),
    })

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Welcome Section */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back, {user?.firstName}!
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Your AI-powered lab notebook is ready to help with your research.
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <UploadWizard />
                </div>

                {/* Recent Documents */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
                        <a
                            href="/documents"
                            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                        >
                            View all
                        </a>
                    </div>
                    {documentsLoading ? (
                        <div className="text-gray-500">Loading documents...</div>
                    ) : documents?.data?.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {documents.data.map((doc: any) => (
                                <DocumentCard key={doc.id} document={doc} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-500">No documents yet. Upload your first document to get started.</div>
                    )}
                </div>

                {/* Recent Datasets */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Datasets</h2>
                        <a
                            href="/datasets"
                            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                        >
                            View all
                        </a>
                    </div>
                    {datasetsLoading ? (
                        <div className="text-gray-500">Loading datasets...</div>
                    ) : datasets?.data?.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {datasets.data.map((dataset: any) => (
                                <DatasetCard key={dataset.id} dataset={dataset} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-500">No datasets yet. Upload your first dataset to get started.</div>
                    )}
                </div>

                {/* Recent Experiments */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Experiments</h2>
                        <a
                            href="/experiments"
                            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                        >
                            View all
                        </a>
                    </div>
                    {experimentsLoading ? (
                        <div className="text-gray-500">Loading experiments...</div>
                    ) : experiments?.experiments?.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {experiments.experiments.map((experiment: any) => (
                                <ExperimentCard key={experiment.id} experiment={experiment} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-500">No experiments yet. Generate summaries from your documents to see experiments.</div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
