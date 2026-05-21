export function useNotification() {
  const permission = ref<NotificationPermission | 'default'>('default')

  async function requestPermission() {
    if (!import.meta.client || !('Notification' in window)) return
    if (permission.value === 'granted') return
    permission.value = await Notification.requestPermission()
  }

  function notify(title: string, options?: NotificationOptions) {
    if (
      import.meta.client &&
      'Notification' in window &&
      document.hidden &&
      permission.value === 'granted'
    ) {
      return new Notification(title, options)
    }
    return null
  }

  return { permission, requestPermission, notify }
}
