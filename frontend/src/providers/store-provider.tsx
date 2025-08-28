'use client'

import { createContext, useContext, useRef } from 'react'
import { type StoreApi, useStore } from 'zustand'
import { createAuthStore, AuthStore } from '@/stores/auth-store'
import { createAppStore, AppStore } from '@/stores/app-store'

interface StoreContextValue {
    authStore: StoreApi<AuthStore>
    appStore: StoreApi<AppStore>
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
    const storeRef = useRef<StoreContextValue>()
    if (!storeRef.current) {
        storeRef.current = {
            authStore: createAuthStore(),
            appStore: createAppStore(),
        }
    }

    return (
        <StoreContext.Provider value={storeRef.current}>
            {children}
        </StoreContext.Provider>
    )
}

export function useAuthStore<T>(selector: (store: AuthStore) => T): T {
    const context = useContext(StoreContext)
    if (!context) {
        throw new Error('useAuthStore must be used within StoreProvider')
    }
    return useStore(context.authStore, selector)
}

export function useAppStore<T>(selector: (store: AppStore) => T): T {
    const context = useContext(StoreContext)
    if (!context) {
        throw new Error('useAppStore must be used within StoreProvider')
    }
    return useStore(context.appStore, selector)
}
