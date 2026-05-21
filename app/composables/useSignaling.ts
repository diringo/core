type MessageHandler = (data: Record<string, unknown>) => void

export function useSignaling() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const handlers = new Map<string, MessageHandler[]>()
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null

  function getWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }

  function startKeepalive() {
    stopKeepalive()
    keepaliveTimer = setInterval(() => {
      if (ws.value?.readyState === WebSocket.OPEN) {
        ws.value.send(JSON.stringify({ type: 'ping' }))
      }
    }, 25000)
  }

  function stopKeepalive() {
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer)
      keepaliveTimer = null
    }
  }

  function attemptReconnect() {
    const MAX_RECONNECT_ATTEMPTS = 5
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
    reconnectAttempts++
    reconnectTimer = setTimeout(() => {
      connect()
    }, delay)
  }

  function connect() {
    if (ws.value?.readyState === WebSocket.OPEN) return
    const url = getWsUrl()
    ws.value = new WebSocket(url)

    ws.value.onopen = () => {
      isConnected.value = true
      reconnectAttempts = 0
      startKeepalive()
    }

    ws.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const type = data.type as string
        const typeHandlers = handlers.get(type)
        if (typeHandlers) {
          typeHandlers.forEach((fn) => fn(data))
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.value.onclose = () => {
      isConnected.value = false
      stopKeepalive()
      attemptReconnect()
    }

    ws.value.onerror = () => {
      isConnected.value = false
      stopKeepalive()
    }
  }

  function send(type: string, data: Record<string, unknown> = {}) {
    if (ws.value?.readyState !== WebSocket.OPEN) return
    ws.value.send(JSON.stringify({ type, ...data }))
  }

  function on(type: string, handler: MessageHandler) {
    if (!handlers.has(type)) handlers.set(type, [])
    handlers.get(type)!.push(handler)
  }

  function off(type: string, handler: MessageHandler) {
    const typeHandlers = handlers.get(type)
    if (typeHandlers) {
      const idx = typeHandlers.indexOf(handler)
      if (idx !== -1) typeHandlers.splice(idx, 1)
    }
  }

  function disconnect() {
    stopKeepalive()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    reconnectAttempts = 0
    ws.value?.close()
    ws.value = null
    isConnected.value = false
  }

  return { isConnected, connect, send, on, off, disconnect }
}
