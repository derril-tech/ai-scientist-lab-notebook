import { useEffect } from 'react'

export class SSEClient {
    private eventSource: EventSource | null = null
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    private reconnectDelay = 1000

    constructor(
        private url: string,
        private options: {
            onMessage?: (data: any) => void
            onError?: (error: Event) => void
            onOpen?: () => void
            onClose?: () => void
            headers?: Record<string, string>
        } = {}
    ) { }

    connect(): void {
        try {
            this.eventSource = new EventSource(this.url)
            this.setupEventListeners()
        } catch (error) {
            console.error('Failed to create EventSource:', error)
            this.handleError(error as Event)
        }
    }

    private setupEventListeners(): void {
        if (!this.eventSource) return

        this.eventSource.onopen = () => {
            console.log('SSE connection opened')
            this.reconnectAttempts = 0
            this.options.onOpen?.()
        }

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                this.options.onMessage?.(data)
            } catch (error) {
                console.error('Failed to parse SSE message:', error)
            }
        }

        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error)
            this.handleError(error)
        }
    }

    private handleError(error: Event): void {
        this.options.onError?.(error)

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

            setTimeout(() => {
                this.disconnect()
                this.connect()
            }, delay)
        } else {
            console.error('Max reconnection attempts reached')
            this.options.onClose?.()
        }
    }

    disconnect(): void {
        if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
        }
    }

    isConnected(): boolean {
        return this.eventSource?.readyState === EventSource.OPEN
    }
}

// Hook for using SSE in React components
export function useSSE(
    url: string,
    options: {
        onMessage?: (data: any) => void
        onError?: (error: Event) => void
        onOpen?: () => void
        onClose?: () => void
        enabled?: boolean
    } = {}
) {
    const { enabled = true, ...sseOptions } = options

    useEffect(() => {
        if (!enabled) return

        const sseClient = new SSEClient(url, sseOptions)
        sseClient.connect()

        return () => {
            sseClient.disconnect()
        }
    }, [url, enabled, ...Object.values(sseOptions)])
}



