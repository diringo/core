import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  telemetry: false,
  devtools: { enabled: false },
  css: ['./app/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  modules: ['shadcn-nuxt', '@nuxt/icon'],
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui'
  },
  nitro: {
    experimental: {
      websocket: true,
    },
  },
  runtimeConfig: {
    public: {
      brandName: process.env.NUXT_PUBLIC_BRAND_NAME || 'Diringo',
      brandUrl: process.env.NUXT_PUBLIC_BRAND_URL || 'https://diringo.com',
      brandYear: process.env.NUXT_PUBLIC_BRAND_YEAR || '2026',
      stunServers: process.env.NUXT_PUBLIC_STUN_SERVERS || 'stun:stun.cloudflare.com:3478',
      turnServers: process.env.NUXT_PUBLIC_TURN_SERVERS || '',
      turnUsername: process.env.NUXT_PUBLIC_TURN_USERNAME || '',
      turnCredential: process.env.NUXT_PUBLIC_TURN_CREDENTIAL || '',
    },
  },
  devServer: {
    host: '0.0.0.0',
    port: 3000
  }
})
