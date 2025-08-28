'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi, datasetsApi } from '@/lib/api'
import { toast } from 'react-hot-toast'
import {
    DocumentArrowUpIcon,
    TableCellsIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline'

interface UploadFile {
    file: File
    type: 'document' | 'dataset'
    status: 'uploading' | 'success' | 'error'
    progress: number
    error?: string
}

export function UploadWizard() {
    const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([])
    const queryClient = useQueryClient()

    const documentUploadMutation = useMutation({
        mutationFn: documentsApi.upload,
        onSuccess: (data, variables) => {
            setUploadedFiles(prev =>
                prev.map(f =>
                    f.file === variables
                        ? { ...f, status: 'success', progress: 100 }
                        : f
                )
            )
            queryClient.invalidateQueries({ queryKey: ['documents'] })
            toast.success('Document uploaded successfully!')
        },
        onError: (error: any, variables) => {
            setUploadedFiles(prev =>
                prev.map(f =>
                    f.file === variables
                        ? { ...f, status: 'error', error: error.response?.data?.message || 'Upload failed' }
                        : f
                )
            )
            toast.error('Document upload failed')
        }
    })

    const datasetUploadMutation = useMutation({
        mutationFn: datasetsApi.upload,
        onSuccess: (data, variables) => {
            setUploadedFiles(prev =>
                prev.map(f =>
                    f.file === variables
                        ? { ...f, status: 'success', progress: 100 }
                        : f
                )
            )
            queryClient.invalidateQueries({ queryKey: ['datasets'] })
            toast.success('Dataset uploaded successfully!')
        },
        onError: (error: any, variables) => {
            setUploadedFiles(prev =>
                prev.map(f =>
                    f.file === variables
                        ? { ...f, status: 'error', error: error.response?.data?.message || 'Upload failed' }
                        : f
                )
            )
            toast.error('Dataset upload failed')
        }
    })

    const onDrop = (acceptedFiles: File[]) => {
        const newFiles: UploadFile[] = acceptedFiles.map(file => ({
            file,
            type: file.type.includes('pdf') ? 'document' : 'dataset',
            status: 'uploading',
            progress: 0
        }))

        setUploadedFiles(prev => [...prev, ...newFiles])

        // Simulate progress and upload
        newFiles.forEach(uploadFile => {
            const interval = setInterval(() => {
                setUploadedFiles(prev =>
                    prev.map(f =>
                        f.file === uploadFile.file
                            ? { ...f, progress: Math.min(f.progress + 10, 90) }
                            : f
                    )
                )
            }, 200)

            setTimeout(() => {
                clearInterval(interval)

                if (uploadFile.type === 'document') {
                    documentUploadMutation.mutate(uploadFile.file)
                } else {
                    datasetUploadMutation.mutate(uploadFile.file)
                }
            }, 1000)
        })
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        }
    })

    const removeFile = (file: File) => {
        setUploadedFiles(prev => prev.filter(f => f.file !== file))
    }

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
            >
                <input {...getInputProps()} />
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                    {isDragActive
                        ? 'Drop the files here...'
                        : 'Drag & drop files here, or click to select files'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                    Supports PDF documents and CSV/Excel datasets
                </p>
            </div>

            {/* Upload Progress */}
            {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-900">Upload Progress</h3>
                    {uploadedFiles.map((uploadFile, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-shrink-0">
                                {uploadFile.type === 'document' ? (
                                    <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                                ) : (
                                    <TableCellsIcon className="h-5 w-5 text-green-500" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {uploadFile.file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {uploadFile.type === 'document' ? 'Document' : 'Dataset'}
                                </p>
                            </div>

                            <div className="flex items-center space-x-2">
                                {uploadFile.status === 'uploading' && (
                                    <div className="flex-1">
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadFile.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {uploadFile.status === 'success' && (
                                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                )}

                                {uploadFile.status === 'error' && (
                                    <XCircleIcon className="h-5 w-5 text-red-500" />
                                )}

                                <button
                                    onClick={() => removeFile(uploadFile.file)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XCircleIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
