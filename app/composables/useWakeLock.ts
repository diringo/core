export function useWakeLock() {
  let sentinel: WakeLockSentinel | null = null
  const isHeld = ref(false)

  async function request() {
    if (!import.meta.client || !('wakeLock' in navigator)) return
    if (sentinel) return
    try {
      sentinel = await navigator.wakeLock.request('screen')
      isHeld.value = true
      sentinel.addEventListener('release', () => {
        isHeld.value = false
        sentinel = null
      })
    } catch {
      // wake lock request denied (e.g. battery saving mode)
    }
  }

  function release() {
    if (!sentinel) return
    sentinel.release()
    sentinel = null
    isHeld.value = false
  }

  onUnmounted(() => release())

  return { isHeld, request, release }
}
