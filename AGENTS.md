# Diringo — P2P File Sharing

## Stack
- **Nuxt v4** (`app/` directory — all source under `app/`)
- **Tailwind CSS v4** (no `tailwind.config.js`; `@import "tailwindcss"` in CSS)
- **shadcn-vue** (New York style, neutral base, CSS variables, dark theme)
- **Solar icons** via `@nuxt/icon` (`<Icon name="solar:..." />`)
- **crossws** — WebSocket signaling built into Nuxt/Nitro (h3 `defineWebSocketHandler`)
- **Bun** (lockfile: `bun.lock`)
- TypeScript, Composition API with `<script setup lang="ts">`

## Commands
| Command | Script |
|---|---|
| Dev server | `bun run dev` → `nuxt dev` — `0.0.0.0:3000` |
| Build | `bun run build` → `nuxt build` |
| Preview | `bun run preview` |
| Typecheck | `npx nuxt typecheck` (no script in package.json) |

No tests, no linting, no formatter.

## Project structure
- `server/routes/ws.ts` — WebSocket signaling handler (crossws via h3)
- `app/` — all application code
  - `pages/index.vue` — single-page app orchestrating the full session flow
  - `components/` — auto-imported by Nuxt + `ui/` subdir for shadcn
  - `composables/` — `useSession`, `useSignaling`, `useWebRTC`, `useFileTransfer`
  - `layouts/default.vue` — wrapper only
  - `lib/utils.ts` — `cn()` helper
  - `assets/css/main.css` — Tailwind v4 + Diringo custom theme tokens
- `ecosystem.config.js` — PM2 config for VPS deployment

## Path aliases
- `@/` → `app/`
- `@/components/ui/` → `app/components/ui/`
- `@/lib/` → `app/lib/`

## Important quirks
- **Frontend-only prototype** — no backend, no database, no auth. All data is ephemeral (in-memory sessions).
- **WebSocket signaling** lives in `server/routes/ws.ts` using `defineWebSocketHandler` from h3. Session state is in-memory (`Map<string, Session>`).
- **Session codes** are 6-char alphanumeric, generated server-side.
- **WebRTC** uses Google STUN + metered.ca free TURN (configured via `NUXT_PUBLIC_TURN_*` env vars).
- **File transfer** uses 64KB chunks over `RTCDataChannel`. No server-side file storage.
- **Auto-imports active** — Nuxt auto-imports components under `app/components/` and composables under `app/composables/`.
- **shadcn components** live in `app/components/ui/<name>/` with barrel `index.ts` + `.vue` file. Add via `npx shadcn-vue@latest add <name>`.
- **MCP servers**: `shadcnVue` (local) and `nuxt` (remote) — configured in `opencode.json`.
- **Dark theme default** — CSS variables in `main.css`, `.dark` class variant via `@custom-variant`.
- **PM2** is used for production deployment (`pm2.config.js`). Behind Nginx/Caddy reverse proxy for SSL.
- **Env vars**: `NUXT_PUBLIC_TURN_USERNAME`, `NUXT_PUBLIC_TURN_CREDENTIAL` for TURN relay credentials.

## Non-Functional Requirement
- All transfers should be streamed, not buffered in browser memory.
