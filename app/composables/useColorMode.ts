export function useColorMode() {
  const cookie = useCookie<string | null>('color-mode')
  const initialMode = cookie.value === 'dark' || cookie.value === 'light' ? cookie.value : 'system'
  const colorMode = ref<'system' | 'light' | 'dark'>(initialMode)

  const isDark = ref(colorMode.value === 'dark')
  const mediaQuery = import.meta.client ? window.matchMedia('(prefers-color-scheme: dark)') : undefined

  function persist(val: 'system' | 'light' | 'dark') {
    cookie.value = val === 'system' ? null : val
  }

  function apply() {
    let dark: boolean
    if (colorMode.value === 'system') {
      dark = mediaQuery?.matches ?? false
    } else {
      dark = colorMode.value === 'dark'
    }
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
  }

  function toggle() {
    const modes: Array<'system' | 'light' | 'dark'> = ['system', 'dark', 'light']
    const idx = Math.max(0, modes.indexOf(colorMode.value))
    colorMode.value = modes[(idx + 1) % modes.length]!
    persist(colorMode.value)
    apply()
  }

  if (import.meta.client) {
    const stored = cookie.value
    if (stored === 'dark' || stored === 'light') {
      colorMode.value = stored
    }
    mediaQuery?.addEventListener('change', apply)
    apply()
  }

  return { colorMode, isDark, toggle }
}
