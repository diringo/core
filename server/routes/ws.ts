import type { Peer } from 'crossws'

const sessions = new Map<string, { creator: Peer; peer?: Peer }>()

function generateCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return sessions.has(code) ? generateCode() : code
}

export default defineWebSocketHandler({
  open(peer) {
    peer.send(JSON.stringify({ type: 'connected', peerId: peer.id }))
  },

  message(peer, message) {
    const data = JSON.parse(message.text())
    if (!data.type) return

    switch (data.type) {
      case 'create-session': {
        const code = generateCode()
        sessions.set(code, { creator: peer })
        peer.context.sessionCode = code
        peer.context.role = 'creator'
        peer.send(JSON.stringify({ type: 'session-created', code }))
        break
      }

      case 'join-session': {
        const { code } = data
        const session = sessions.get(code)
        if (!session) {
          peer.send(JSON.stringify({ type: 'error', message: 'Session not found' }))
          return
        }
        if (session.peer) {
          peer.send(JSON.stringify({ type: 'error', message: 'Session is full' }))
          return
        }
        session.peer = peer
        peer.context.sessionCode = code
        peer.context.role = 'peer'

        session.creator.send(JSON.stringify({ type: 'peer-joined', peerId: peer.id }))
        peer.send(JSON.stringify({ type: 'session-joined', code, peerId: session.creator.id }))
        break
      }

      case 'ping':
        peer.send(JSON.stringify({ type: 'pong' }))
        break

      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        const session = sessions.get(peer.context.sessionCode as string)
        if (!session) return
        const target = peer.context.role === 'creator' ? session.peer : session.creator
        if (target) {
          target.send(JSON.stringify({ type: data.type, data: data.data }))
        }
        break
      }
    }
  },

  close(peer) {
    const code = peer.context.sessionCode as string | undefined
    if (!code) return
    const session = sessions.get(code)
    if (!session) return

    if (peer.context.role === 'creator') {
      session.peer?.send(JSON.stringify({ type: 'peer-disconnected' }))
      sessions.delete(code)
    } else {
      session.creator.send(JSON.stringify({ type: 'peer-disconnected' }))
      delete session.peer
    }
  },
})
