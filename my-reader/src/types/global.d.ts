export {}

declare global {
  interface ServiceWorkerGlobalScope extends Worker {
    skipWaiting: () => void
    clients: any
  }
}