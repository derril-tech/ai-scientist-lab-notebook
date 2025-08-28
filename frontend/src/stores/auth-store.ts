import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    avatarUrl?: string
    workspaceId: string
}

export interface AuthState {
    user: User | null
    token: string | null
    refreshToken: string | null
    isAuthenticated: boolean
    isLoading: boolean
}

export interface AuthActions {
    setUser: (user: User | null) => void
    setToken: (token: string | null) => void
    setRefreshToken: (token: string | null) => void
    setLoading: (loading: boolean) => void
    login: (user: User, token: string, refreshToken: string) => void
    logout: () => void
    updateUser: (updates: Partial<User>) => void
}

export type AuthStore = AuthState & AuthActions

export const createAuthStore = () =>
    create<AuthStore>()(
        persist(
            (set, get) => ({
                // State
                user: null,
                token: null,
                refreshToken: null,
                isAuthenticated: false,
                isLoading: false,

                // Actions
                setUser: (user) =>
                    set({ user, isAuthenticated: !!user }),

                setToken: (token) =>
                    set({ token }),

                setRefreshToken: (refreshToken) =>
                    set({ refreshToken }),

                setLoading: (isLoading) =>
                    set({ isLoading }),

                login: (user, token, refreshToken) =>
                    set({
                        user,
                        token,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                    }),

                logout: () =>
                    set({
                        user: null,
                        token: null,
                        refreshToken: null,
                        isAuthenticated: false,
                        isLoading: false,
                    }),

                updateUser: (updates) =>
                    set((state) => ({
                        user: state.user ? { ...state.user, ...updates } : null,
                    })),
            }),
            {
                name: 'auth-storage',
                partialize: (state) => ({
                    user: state.user,
                    token: state.token,
                    refreshToken: state.refreshToken,
                    isAuthenticated: state.isAuthenticated,
                }),
            }
        )
    )
