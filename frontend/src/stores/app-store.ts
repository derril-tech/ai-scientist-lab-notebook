import { create } from 'zustand'

export interface AppState {
    sidebarOpen: boolean
    currentDocumentId: string | null
    currentDatasetId: string | null
    currentExperimentId: string | null
    currentPlotId: string | null
    theme: 'light' | 'dark' | 'system'
    language: string
    notifications: Notification[]
}

export interface Notification {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: Date
    read: boolean
}

export interface AppActions {
    setSidebarOpen: (open: boolean) => void
    setCurrentDocumentId: (id: string | null) => void
    setCurrentDatasetId: (id: string | null) => void
    setCurrentExperimentId: (id: string | null) => void
    setCurrentPlotId: (id: string | null) => void
    setTheme: (theme: 'light' | 'dark' | 'system') => void
    setLanguage: (language: string) => void
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
    markNotificationRead: (id: string) => void
    removeNotification: (id: string) => void
    clearNotifications: () => void
}

export type AppStore = AppState & AppActions

export const createAppStore = () =>
    create<AppStore>((set, get) => ({
        // State
        sidebarOpen: false,
        currentDocumentId: null,
        currentDatasetId: null,
        currentExperimentId: null,
        currentPlotId: null,
        theme: 'system',
        language: 'en',
        notifications: [],

        // Actions
        setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

        setCurrentDocumentId: (currentDocumentId) => set({ currentDocumentId }),

        setCurrentDatasetId: (currentDatasetId) => set({ currentDatasetId }),

        setCurrentExperimentId: (currentExperimentId) => set({ currentExperimentId }),

        setCurrentPlotId: (currentPlotId) => set({ currentPlotId }),

        setTheme: (theme) => set({ theme }),

        setLanguage: (language) => set({ language }),

        addNotification: (notification) =>
            set((state) => ({
                notifications: [
                    ...state.notifications,
                    {
                        ...notification,
                        id: crypto.randomUUID(),
                        timestamp: new Date(),
                        read: false,
                    },
                ],
            })),

        markNotificationRead: (id) =>
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, read: true } : n
                ),
            })),

        removeNotification: (id) =>
            set((state) => ({
                notifications: state.notifications.filter((n) => n.id !== id),
            })),

        clearNotifications: () => set({ notifications: [] }),
    }))
