# Diringo — P2P File Sharing

Share files directly between browsers. No uploads, no servers, no accounts. End-to-end encrypted.

Built with [Nuxt v4](https://nuxt.com) + WebRTC.

## How it works

1. **Create a session** — you get a random 6-character code
2. **Share the code** — send it to anyone
3. **Files transfer peer-to-peer** — directly between browsers via WebRTC, streamed through a Service Worker

All data is ephemeral. No files are stored on any server. Sessions disappear when both peers disconnect.

## Features

- Peer-to-peer file transfer via WebRTC — files stream directly between browsers
- End-to-end encryption (AES-256-GCM) — keys exchanged over the signaling channel
- No file size limit — files stream in 64KB chunks
- Service Worker streaming — large files download as they arrive, no in-memory buffering
- Built-in chat — send messages alongside files
- TURN relay support — works behind restrictive NATs (self-hosted coturn or any STUN/TURN server)

## Architecture

```
┌─────────────┐   WebSocket (signaling)   ┌─────────────┐
│  Browser A  │◄─────────────────────────►│  Browser B  │
│  (creator)  │                           │  (joiner)   │
│             │◄──── WebRTC (P2P data) ──►│             │
└─────────────┘                           └─────────────┘
       │                                         │
       │    ┌──────────────┐                     │
       └───►│ STUN/TURN    │◄────────────────────┘
            │ (configurable)│
            └──────────────┘
```

- **Signaling** — WebSocket via Nuxt/Nitro (`crossws` / `h3`), used only to exchange connection metadata
- **WebRTC** — data channel for file chunks + chat messages
- **Service Worker** — intercepts streamed data, writes to a `ReadableStream`, triggers a download
- **Database** — PostgreSQL via Knex (optional, for analytics and feedback collection)

## Getting Started

```bash
bun install
cp .env.example .env   # configure STUN/TURN and database
bun run dev
```

Opens at `http://0.0.0.0:3000`

### Configuration

| Env var | Default | Description |
|---|---|---|
| `NUXT_PUBLIC_BRAND_NAME` | `Diringo` | Application name (used in titles, footer, links) |
| `NUXT_PUBLIC_BRAND_URL` | `https://diringo.com` | Logo link URL |
| `NUXT_PUBLIC_BRAND_YEAR` | `2026` | Footer copyright year |
| `NUXT_PUBLIC_STUN_SERVERS` | `stun:stun.cloudflare.com:3478` | Comma-separated STUN server URLs |
| `NUXT_PUBLIC_TURN_SERVERS` | — | Comma-separated TURN server URLs |
| `NUXT_PUBLIC_TURN_USERNAME` | — | TURN username (required if TURN servers use auth) |
| `NUXT_PUBLIC_TURN_CREDENTIAL` | — | TURN credential |
| `DATABASE_URL` | — | PostgreSQL connection string (optional, disables analytics if omitted) |

## Rebranding for your deployment

Fork this project and deploy under your own name and brand. Set these env vars (see [Configuration](#configuration)):

```bash
NUXT_PUBLIC_BRAND_NAME=MyApp
NUXT_PUBLIC_BRAND_URL=https://myapp.com
NUXT_PUBLIC_BRAND_YEAR=2026
```

Also replace `public/favicon.ico` with your own icon.

## Deployment

```bash
bun run build
bun run preview
```

For production, use PM2 or any Node.js process manager. The server is a Nuxt/Nitro app — deployable to any Node.js host (VPS, Railway, Fly.io, etc.).

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | [Nuxt v4](https://nuxt.com) |
| UI | Tailwind CSS v4 + [shadcn-vue](https://www.shadcn-vue.com) (New York style) |
| Icons | [Solar](https://nuxt.com/modules/icon) via `@nuxt/icon` |
| Signaling | `crossws` (built into Nuxt/Nitro) |
| Database | PostgreSQL via [Knex](https://knexjs.org) |
| Crypto | Web Crypto API (AES-256-GCM) |
| Streaming | Service Worker `ReadableStream` |

## License

MIT
