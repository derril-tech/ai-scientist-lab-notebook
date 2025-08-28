import axios from 'axios'
import { useAuthStore } from '@/providers/store-provider'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                const refreshToken = useAuthStore.getState().refreshToken
                if (refreshToken) {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refresh_token: refreshToken,
                    })

                    const { access_token, refresh_token } = response.data
                    useAuthStore.getState().setToken(access_token)
                    useAuthStore.getState().setRefreshToken(refresh_token)

                    originalRequest.headers.Authorization = `Bearer ${access_token}`
                    return api(originalRequest)
                }
            } catch (refreshError) {
                useAuthStore.getState().logout()
                window.location.href = '/auth/login'
            }
        }

        return Promise.reject(error)
    }
)

// API endpoints
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),

    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refresh_token: refreshToken }),

    me: () => api.get('/auth/me'),

    usage: () => api.get('/auth/usage'),
}

export const documentsApi = {
    upload: (file: File) => {
        const formData = new FormData()
        formData.append('file', file)
        return api.post('/documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },

    list: (params?: { limit?: number; offset?: number; status?: string }) =>
        api.get('/documents', { params }),

    get: (id: string) => api.get(`/documents/${id}`),

    reparse: (id: string) => api.post(`/documents/${id}/reparse`),
}

export const qaApi = {
    ask: (question: string, documentIds?: string[]) =>
        api.post('/qa', { question, document_ids: documentIds }),

    getAnswer: (id: string) => api.get(`/answers/${id}`),

    getCitations: (id: string) => api.get(`/answers/${id}/citations`),
}

export const summariesApi = {
    generateExperiments: (documentId: string) =>
        api.post(`/summaries/${documentId}/experiments`),

    listExperiments: (params?: {
        documentId?: string
        limit?: number
        offset?: number
    }) => api.get('/summaries/experiments', { params }),

    getExperiment: (id: string) => api.get(`/summaries/experiments/${id}`),
}

export const plotsApi = {
    create: (plotSpec: any) => api.post('/plots', plotSpec),

    list: (params?: {
        dataSource?: string
        plotType?: string
        limit?: number
        offset?: number
    }) => api.get('/plots', { params }),

    get: (id: string) => api.get(`/plots/${id}`),

    getPng: (id: string) => api.get(`/plots/${id}/png`),

    getSvg: (id: string) => api.get(`/plots/${id}/svg`),

    getCode: (id: string) => api.get(`/plots/${id}/code`),
}

export const datasetsApi = {
    upload: (file: File) => {
        const formData = new FormData()
        formData.append('file', file)
        return api.post('/datasets', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },

    list: (params?: { limit?: number; offset?: number }) =>
        api.get('/datasets', { params }),

    get: (id: string) => api.get(`/datasets/${id}`),

    preview: (id: string, limit = 100) =>
        api.get(`/datasets/${id}/preview`, { params: { limit } }),
}

export const bundlesApi = {
    createNotebook: (spec: any) => api.post('/bundles/notebook', spec),

    exportTables: (documentId: string, format: 'csv' | 'xlsx') =>
        api.get(`/exports/tables.${format}`, { params: { document_id: documentId } }),
}
