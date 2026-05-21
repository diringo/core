export function useHaptic() {
  const canVibrate = import.meta.client && 'vibrate' in navigator

  function vibrate(pattern: number | number[]) {
    if (canVibrate) navigator.vibrate(pattern)
  }

  return { vibrate }
}
