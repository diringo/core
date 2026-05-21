import { E2EE_TYPE_CHAT } from './useE2EE'

export interface ChatMessage {
  id: string
  text: string
  sender: 'you' | 'peer'
  timestamp: number
}

export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const unread = ref(0)
  let channel: RTCDataChannel | null = null
  let e2ee: { isReady: Ref<boolean>; encrypt: (type: number, payload: ArrayBuffer) => Promise<ArrayBuffer> } | null = null

  function setDataChannel(dc: RTCDataChannel, e2eeInstance?: typeof e2ee) {
    channel = dc
    e2ee = e2eeInstance ?? null
  }

  async function sendMessage(text: string) {
    if (!channel || channel.readyState !== 'open' || !text.trim()) return

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      text: text.trim(),
      sender: 'you',
      timestamp: Date.now(),
    }
    messages.value.push(msg)

    if (e2ee?.isReady.value) {
      const payload = new TextEncoder().encode(JSON.stringify({ text: msg.text }))
      channel.send(await e2ee.encrypt(E2EE_TYPE_CHAT, payload.buffer as ArrayBuffer))
    } else {
      channel.send(JSON.stringify({ msgType: 'chat', text: msg.text }))
    }
  }

  function handleChatMessage(text: string) {
    messages.value.push({
      id: crypto.randomUUID(),
      text,
      sender: 'peer',
      timestamp: Date.now(),
    })
    unread.value++
  }

  function reset() {
    messages.value = []
    unread.value = 0
  }

  return { messages, unread, sendMessage, handleChatMessage, setDataChannel, reset }
}
