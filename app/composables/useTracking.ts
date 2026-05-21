export function useTracking() {
  function track(event: string, data?: Record<string, unknown>) {
    if (!import.meta.client) return

    fetch('/api/track', {
      method: 'POST',
      body: JSON.stringify({ event, data: data ?? null }),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {})
  }

  return { track }
}
