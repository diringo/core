module.exports = {
  apps: [
    {
      name: 'diringo',
      script: './server/index.mjs',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL,
        NUXT_PUBLIC_BRAND_NAME: process.env.NUXT_PUBLIC_BRAND_NAME || 'Diringo',
        NUXT_PUBLIC_BRAND_URL: process.env.NUXT_PUBLIC_BRAND_URL || 'https://diringo.com',
        NUXT_PUBLIC_BRAND_YEAR: process.env.NUXT_PUBLIC_BRAND_YEAR || '2026',
        NUXT_PUBLIC_STUN_SERVERS: process.env.NUXT_PUBLIC_STUN_SERVERS || 'stun:stun.cloudflare.com:3478',
        NUXT_PUBLIC_TURN_SERVERS: process.env.NUXT_PUBLIC_TURN_SERVERS,
        NUXT_PUBLIC_TURN_USERNAME: process.env.NUXT_PUBLIC_TURN_USERNAME,
        NUXT_PUBLIC_TURN_CREDENTIAL: process.env.NUXT_PUBLIC_TURN_CREDENTIAL,
      },
    },
  ],
}
