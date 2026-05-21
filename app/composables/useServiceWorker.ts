export function useServiceWorker() {
  const isReady = ref(false)
  const isSupported = ref(true)
  let registration: ServiceWorkerRegistration | null = null
  let sw: ServiceWorker | null = null
  let pendingCallbacks: Array<() => void> = []

  async function register() {
    if (!import.meta.client) return
    if (!('serviceWorker' in navigator)) {
      isSupported.value = false
      return
    }

    try {
      registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })

      const setActive = (worker: ServiceWorker) => {
        sw = worker
        isReady.value = true
        for (const cb of pendingCallbacks) cb()
        pendingCallbacks = []
      }

      if (registration.active) {
        setActive(registration.active)
        return
      }

      if (registration.installing) {
        registration.installing.addEventListener('statechange', () => {
          if (registration?.installing?.state === 'activated') setActive(registration.installing)
        })
      }

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (registration?.active && !sw) setActive(registration.active)
      })
    } catch (err) {
      console.error('[SW] Registration failed:', err)
      isSupported.value = false
    }
  }

  function postMessage(data: Record<string, unknown>, transfer?: Transferable[]) {
    sw?.postMessage(data, transfer as any)
  }

  function initDownload(meta: FileMeta): Promise<string> {
    return new Promise((resolve, reject) => {
      const doInit = () => {
        if (!sw) return reject(new Error('Service Worker not available'))

        const handler = (event: MessageEvent) => {
          if (event.data?.type === 'stream-ready' && event.data.fileId === meta.id) {
            navigator.serviceWorker.removeEventListener('message', handler)
            resolve(`/sw-download/${meta.id}`)
          }
        }
        navigator.serviceWorker.addEventListener('message', handler)

        sw.postMessage({
          type: 'init-stream',
          fileId: meta.id,
          fileName: meta.name,
          fileSize: meta.size,
          fileType: meta.type,
        })
      }

      if (isReady.value) {
        doInit()
      } else {
        pendingCallbacks.push(doInit)
      }
    })
  }

  function writeChunk(fileId: string, buffer: ArrayBuffer) {
    sw?.postMessage({ type: 'write-chunk', fileId, chunk: buffer }, [buffer])
  }

  function closeDownload(fileId: string) {
    sw?.postMessage({ type: 'close-stream', fileId })
  }

  function abortDownload(fileId: string) {
    sw?.postMessage({ type: 'abort-stream', fileId })
  }

  return { isReady, isSupported, register, postMessage, initDownload, writeChunk, closeDownload, abortDownload }
}
