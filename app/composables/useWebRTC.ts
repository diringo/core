export function useWebRTC() {
  let pc: RTCPeerConnection | null = null
  let dataChannel: RTCDataChannel | null = null
  let hasRelayCandidate = false
  const onIceCandidate = ref<((candidate: RTCIceCandidateInit) => void) | null>(null)
  const connectionType = ref<'direct' | 'relay' | null>(null)

  function getIceServers() {
    const config = useRuntimeConfig()
    const servers: RTCIceServer[] = []

    const stunUrls = (config.public.stunServers as string).split(',').map(s => s.trim()).filter(Boolean)
    for (const url of stunUrls) {
      servers.push({ urls: [url] })
    }

    const turnUrls = (config.public.turnServers as string).split(',').map(s => s.trim()).filter(Boolean)
    if (turnUrls.length > 0 && config.public.turnUsername && config.public.turnCredential) {
      servers.push({
        urls: turnUrls,
        username: config.public.turnUsername,
        credential: config.public.turnCredential,
      })
    } else if (turnUrls.length > 0) {
      for (const url of turnUrls) {
        servers.push({ urls: [url] })
      }
    }

    if (import.meta.dev) {
      console.log('[WebRTC] ICE servers:', servers.map(s => ({
        urls: s.urls,
        hasAuth: !!s.username,
      })))
    }
    return servers
  }

  function createPeerConnection() {
    pc = new RTCPeerConnection({ iceServers: getIceServers() })
    hasRelayCandidate = false
    connectionType.value = null

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        if (import.meta.dev) {
          console.log(`[WebRTC] ICE candidate: ${event.candidate.type}`, event.candidate.address)
        }
        if (event.candidate.type === 'relay') {
          hasRelayCandidate = true
          connectionType.value = 'relay'
        }
        if (onIceCandidate.value) {
          onIceCandidate.value(event.candidate.toJSON())
        }
      }
    }

    pc.onicecandidateerror = (event) => {
      if (import.meta.dev) {
        const e = event as Event & { errorText?: string; url?: string; errorCode?: number; hostCandidate?: string }
        console.warn(`[ICE error] ${e.errorText}`, {
          url: e.url,
          errorCode: e.errorCode,
          hostCandidate: e.hostCandidate,
        })
      }
    }

    return pc
  }

  function resolveConnectionType() {
    if (connectionType.value === null) {
      connectionType.value = 'direct'
    }
    if (import.meta.dev) {
      console.log(`[WebRTC] Connection type: ${connectionType.value}`)
    }
  }

  function createDataChannel(label = 'file-transfer') {
    if (!pc) return null
    dataChannel = pc.createDataChannel(label, {
      ordered: true,
    })
    return dataChannel
  }

  function setRemoteDescription(desc: RTCSessionDescriptionInit) {
    if (!pc) return
    return pc.setRemoteDescription(new RTCSessionDescription(desc))
  }

  async function createOffer(options?: RTCOfferOptions) {
    if (!pc) return null
    const offer = await pc.createOffer(options)
    await pc.setLocalDescription(offer)
    return offer
  }

  async function createAnswer() {
    if (!pc) return null
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return answer
  }

  async function addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!pc) return
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch {
      // ignore invalid candidates
    }
  }

  function close() {
    dataChannel?.close()
    pc?.close()
    pc = null
    dataChannel = null
  }

  return {
    onIceCandidate,
    connectionType,
    resolveConnectionType,
    createPeerConnection,
    createDataChannel,
    setRemoteDescription,
    createOffer,
    createAnswer,
    addIceCandidate,
    close,
  }
}
