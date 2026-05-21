export type SessionState = 'idle' | 'creating' | 'joining' | 'waiting' | 'connected' | 'transferring' | 'disconnected'

export function useSession() {
  const signaling = useSignaling()
  const webrtc = useWebRTC()
  const fileTransfer = useFileTransfer()
  const e2ee = useE2EE()
  const chat = useChat()
  const sessionCode = ref('')
  const peerId = ref('')
  const localPeerId = ref('')
  const sessionState = ref<SessionState>('idle')
  const error = ref('')

  let rtcPc: RTCPeerConnection | null = null
  let dc: RTCDataChannel | null = null
  let role: 'creator' | 'joiner' = 'creator'
  let dcKeepaliveTimer: ReturnType<typeof setInterval> | null = null
  let iceRestartTimer: ReturnType<typeof setTimeout> | null = null

  signaling.on('session-created', (data) => {
    sessionCode.value = data.code as string
    sessionState.value = 'waiting'
  })

  signaling.on('session-joined', (data) => {
    sessionCode.value = data.code as string
    peerId.value = data.peerId as string
    sessionState.value = 'waiting'
    startWebRTC('joiner')
  })

  signaling.on('peer-joined', (data) => {
    peerId.value = data.peerId as string
    startWebRTC('creator')
  })

  signaling.on('offer', async (data) => {
    const desc = data.data as RTCSessionDescriptionInit
    await webrtc.setRemoteDescription(desc)
    const answer = await webrtc.createAnswer()
    if (answer) signaling.send('answer', { data: answer })
  })

  signaling.on('answer', async (data) => {
    const desc = data.data as RTCSessionDescriptionInit
    await webrtc.setRemoteDescription(desc)
  })

  signaling.on('ice-candidate', async (data) => {
    await webrtc.addIceCandidate(data.data as RTCIceCandidateInit)
  })

  function startDCKeepalive() {
    stopDCKeepalive()
    dcKeepaliveTimer = setInterval(() => {
      if (dc?.readyState === 'open') {
        dc.send(JSON.stringify({ msgType: 'keepalive' }))
      }
    }, 20000)
  }

  function stopDCKeepalive() {
    if (dcKeepaliveTimer) {
      clearInterval(dcKeepaliveTimer)
      dcKeepaliveTimer = null
    }
  }

  function stopIceRestartTimer() {
    if (iceRestartTimer) {
      clearTimeout(iceRestartTimer)
      iceRestartTimer = null
    }
  }

  function handleDisconnect() {
    stopDCKeepalive()
    stopIceRestartTimer()
    sessionState.value = 'disconnected'
    peerId.value = ''
    e2ee.reset()
    webrtc.close()

    for (const file of fileTransfer.sendQueue.value) {
      if (file.status === 'sending') {
        file.status = 'failed'
      }
    }
    for (const file of fileTransfer.receiveList.value) {
      if (file.status === 'sending') {
        file.status = 'failed'
      }
    }
  }

  signaling.on('peer-disconnected', () => {
    handleDisconnect()
  })

  async function attemptIceRestart() {
    if (role !== 'creator') return
    try {
      const offer = await webrtc.createOffer({ iceRestart: true })
      if (offer) signaling.send('offer', { data: offer })
      stopIceRestartTimer()
      iceRestartTimer = setTimeout(() => {
        if (rtcPc?.iceConnectionState === 'failed') {
          handleDisconnect()
        }
      }, 10000)
    } catch {
      handleDisconnect()
    }
  }

  signaling.on('error', (data) => {
    error.value = data.message as string
    sessionState.value = 'idle'
  })

  signaling.on('connected', (data) => {
    localPeerId.value = data.peerId as string || ''
    if (sessionState.value === 'creating') {
      signaling.send('create-session', {})
    }
    if (sessionState.value === 'joining') {
      signaling.send('join-session', { code: sessionCode.value })
    }
  })

  watch(e2ee.isReady, (ready) => {
    if (ready && role === 'joiner') {
      sessionState.value = 'connected'
    }
  })

  async function startWebRTC(r: 'creator' | 'joiner') {
    role = r
    const pc = webrtc.createPeerConnection()
    rtcPc = pc

    webrtc.onIceCandidate.value = (candidate) => {
      signaling.send('ice-candidate', { data: candidate })
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        attemptIceRestart()
      } else if (pc.iceConnectionState === 'disconnected') {
        stopIceRestartTimer()
        iceRestartTimer = setTimeout(() => {
          if (pc?.iceConnectionState === 'disconnected' || pc?.iceConnectionState === 'failed') {
            handleDisconnect()
          }
        }, 10000)
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        webrtc.resolveConnectionType()
        stopIceRestartTimer()
      }
    }

    const e2eeInstance = {
      isReady: e2ee.isReady,
      encrypt: e2ee.encrypt,
      decrypt: e2ee.decrypt,
      importKey: e2ee.importKey,
    }

    if (role === 'creator') {
      dc = webrtc.createDataChannel()
      if (dc) {
        fileTransfer.setDataChannel(dc, e2eeInstance, chat.handleChatMessage)
        chat.setDataChannel(dc, e2eeInstance)
        dc.onopen = async () => {
          startDCKeepalive()
          await e2ee.generateKey()
          const rawKey = await e2ee.exportKey()
          dc?.send(JSON.stringify({ msgType: 'e2ee-key', key: Array.from(rawKey) }))
          e2ee.isReady.value = true
          sessionState.value = 'connected'
        }
        dc.onclose = () => {
          handleDisconnect()
        }
      }
      const offer = await webrtc.createOffer()
      if (offer) signaling.send('offer', { data: offer })
    } else {
      pc.ondatachannel = (event) => {
        dc = event.channel
        fileTransfer.setDataChannel(dc, e2eeInstance, chat.handleChatMessage)
        chat.setDataChannel(dc, e2eeInstance)
        dc.onopen = () => {
          startDCKeepalive()
          // wait for e2ee key before transitioning to connected
        }
        dc.onclose = () => {
          handleDisconnect()
        }
      }
    }
  }

  function createSession() {
    error.value = ''
    sessionState.value = 'creating'
    signaling.connect()
  }

  function joinSession(code: string) {
    error.value = ''
    sessionCode.value = code
    sessionState.value = 'joining'
    signaling.connect()
  }

  function reset() {
    webrtc.close()
    signaling.disconnect()
    e2ee.reset()
    chat.reset()
    sessionCode.value = ''
    peerId.value = ''
    localPeerId.value = ''
    sessionState.value = 'idle'
    error.value = ''
  }

  return {
    sessionCode,
    peerId,
    localPeerId,
    sessionState,
    error,
    connectionType: webrtc.connectionType,
    fileTransfer,
    e2ee,
    chat,
    createSession,
    joinSession,
    reset,
  }
}
