export function calcChunkSize(fileSize: number): number {
  if (fileSize <= 0) return 65536
  const OVERHEAD = 12 + 16 + 1 // AES-GCM IV + tag + type byte
  const MIN = 65536
  const MAX = 65536 * 4 - OVERHEAD
  const target = Math.ceil(fileSize / 500)
  return Math.max(MIN, Math.min(target, MAX))
}

const E2EE_TYPE_META = 0
const E2EE_TYPE_CHUNK = 1
const E2EE_TYPE_CHAT = 2

interface E2EEInstance {
  isReady: Ref<boolean>
  encrypt: (type: number, payload: ArrayBuffer) => Promise<ArrayBuffer>
  decrypt: (data: ArrayBuffer) => Promise<{ type: number; payload: ArrayBuffer }>
  importKey: (raw: Uint8Array) => Promise<void>
}

export interface FileMeta {
  id: string
  name: string
  size: number
  type: string
  totalChunks: number
}

export type FileStatus = 'pending' | 'sending' | 'done' | 'cancelled' | 'failed'

export interface FileProgress {
  id: string
  name: string
  size: number
  type: string
  chunkSize: number
  loaded: number
  total: number
  done: boolean
  status: FileStatus
  speed: number
}

interface ChunkRecord {
  chunks: Uint8Array[]
  received: number
}

export function useFileTransfer() {
  const sendQueue = ref<FileProgress[]>([])
  const receiveList = ref<FileProgress[]>([])
  const isSending = ref(false)
  let channel: RTCDataChannel | null = null

  let receiveMeta: FileMeta | null = null
  let receiveId = ''
  let receiveLoaded = 0
  let receiveTotal = 0

  let usingFallback = false
  let chunkBuffers = new Map<string, ChunkRecord>()

  let pendingChunksMap = new Map<string, { chunks: ArrayBuffer[]; totalChunks: number; loaded: number }>()
  let streamInitPendingFiles = new Set<string>()
  const fileCompleteAcks = new Map<string, () => void>()

  let e2ee: E2EEInstance | null = null
  let msgQueue: Array<MessageEvent> = []
  let processing = false

  async function processNext() {
    if (processing) return
    processing = true
    while (msgQueue.length > 0) {
      await processMessage(msgQueue.shift()!)
    }
    processing = false
  }

  let pendingFiles = new Map<string, File>()
  let queuedFilesMeta = new Map<string, { name: string; size: number; type: string }>()

  const sw = useServiceWorker()

  if (import.meta.client) {
    sw.register()
  }

  const doneCount = computed(() =>
    [...sendQueue.value, ...receiveList.value].filter((f) => f.status === 'done').length,
  )

  const speedTrackers = new Map<string, { lastLoaded: number; lastTime: number; smoothed: number }>()
  let speedInterval: ReturnType<typeof setInterval> | undefined

  if (import.meta.client) {
    speedInterval = setInterval(() => {
      const now = Date.now()
      const all = [...sendQueue.value, ...receiveList.value]
      for (const file of all) {
        if (file.status !== 'sending') continue
        let t = speedTrackers.get(file.id)
        if (!t) {
          speedTrackers.set(file.id, { lastLoaded: file.loaded, lastTime: now, smoothed: 0 })
          continue
        }
        const dt = (now - t.lastTime) / 1000
        if (dt <= 0) continue
        if (!file.chunkSize) { file.speed = 0; continue }
        const byteDelta = (file.loaded - t.lastLoaded) * file.chunkSize
        if (byteDelta < 0) { t.lastLoaded = file.loaded; t.lastTime = now; continue }
        const instant = byteDelta / dt
        t.smoothed = t.smoothed ? t.smoothed * 0.95 + instant * 0.05 : instant
        file.speed = t.smoothed
        t.lastLoaded = file.loaded
        t.lastTime = now
      }
    }, 200)
  }

  onScopeDispose(() => { if (speedInterval) clearInterval(speedInterval) })

  function handleFileQueued(data: { id: string; name: string; size: number; type: string }) {
    queuedFilesMeta.set(data.id, { name: data.name, size: data.size, type: data.type })

    receiveList.value.push({
      id: data.id,
      name: data.name,
      size: data.size,
      type: data.type,
      chunkSize: 0,
      loaded: 0,
      total: 0,
      done: false,
      status: 'pending',
      speed: 0,
    })
  }

  function handleFileCancel(id: string) {
    queuedFilesMeta.delete(id)
    const idx = receiveList.value.findIndex((f) => f.id === id)
    if (idx !== -1) receiveList.value.splice(idx, 1)
  }

  async function handleFileBegin(data: { id: string; name: string; size: number; type: string; totalChunks: number; chunkSize?: number }) {
    queuedFilesMeta.delete(data.id)

    receiveMeta = { id: data.id, name: data.name, size: data.size, type: data.type, totalChunks: data.totalChunks }
    receiveId = data.id
    receiveLoaded = 0
    receiveTotal = data.totalChunks

    const progress = receiveList.value.find((f) => f.id === data.id)
    if (progress) {
      progress.total = data.totalChunks
      progress.chunkSize = data.chunkSize || 0
      progress.status = 'sending'
    } else {
      receiveList.value.push({
        id: data.id,
        name: data.name,
        size: data.size,
        type: data.type,
        chunkSize: data.chunkSize || 0,
        loaded: 0,
        total: data.totalChunks,
        done: false,
        status: 'sending',
        speed: 0,
      })
    }

    if (sw.isSupported.value) {
      if (import.meta.dev) console.log('[SW] using streaming path')
      usingFallback = false
      pendingChunksMap.set(data.id, { chunks: [], totalChunks: data.totalChunks, loaded: 0 })
      streamInitPendingFiles.add(data.id)
      startStreamingDownload(receiveMeta)
    } else {
      if (import.meta.dev) console.log('[SW] not ready or unsupported, using in-memory fallback')
      usingFallback = true
      chunkBuffers.set(data.id, { chunks: [], received: 0 })
    }
  }

  let onChatMessage: ((text: string) => void) | null = null

  function setDataChannel(dc: RTCDataChannel, e2eeInstance?: E2EEInstance, chatCallback?: (text: string) => void) {
    channel = dc
    channel.binaryType = 'arraybuffer'
    channel.bufferedAmountLowThreshold = 512 * 1024
    e2ee = e2eeInstance ?? null
    onChatMessage = chatCallback ?? null

    channel.onmessage = (event: MessageEvent) => {
      msgQueue.push(event)
      processNext()
    }
  }

  async function processMessage(event: MessageEvent) {
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data)
        if (msg.msgType === 'e2ee-key' && e2ee) {
          await e2ee.importKey(new Uint8Array(msg.key))
          e2ee.isReady.value = true
          return
        }
        if (msg.msgType === 'file-queued') {
          handleFileQueued(msg)
          return
        }
        if (msg.msgType === 'file-begin') {
          await handleFileBegin(msg)
          return
        }
        if (msg.msgType === 'file-cancel') {
          handleFileCancel(msg.id)
          return
        }
        if (msg.msgType === 'chat') {
          onChatMessage?.(msg.text)
          return
        }
        if (msg.msgType === 'keepalive') {
          return
        }
        if (msg.msgType === 'file-complete') {
          const resolve = fileCompleteAcks.get(msg.id)
          if (resolve) {
            resolve()
            fileCompleteAcks.delete(msg.id)
          }
          return
        }
      } catch {
        // ignore malformed messages
      }
      return
    }

    if (e2ee?.isReady.value) {
      try {
        const { type, payload } = await e2ee.decrypt(event.data as ArrayBuffer)
        if (type === E2EE_TYPE_META) {
          const data = JSON.parse(new TextDecoder().decode(payload))
          if (data.msgType === 'file-begin') {
            await handleFileBegin(data)
          }
        } else if (type === E2EE_TYPE_CHAT) {
          const chatMsg = JSON.parse(new TextDecoder().decode(payload))
          onChatMessage?.(chatMsg.text)
        } else {
          await handleChunk(payload)
        }
      } catch {
        // ignore corrupt / tampered data
      }
      return
    }

    if (!receiveMeta) return

    if (usingFallback) {
      handleChunkFallback(event.data as ArrayBuffer)
    } else {
      handleChunkStream(event.data as ArrayBuffer)
    }
  }

  async function handleChunk(buffer: ArrayBuffer) {
    if (usingFallback) {
      handleChunkFallback(buffer)
    } else {
      handleChunkStream(buffer)
    }
  }

  async function startStreamingDownload(meta: FileMeta) {
    streamInitPendingFiles.add(meta.id)
    try {
      const url = await Promise.race([
        sw.initDownload(meta),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('SW init timeout')), 5000)),
      ])
      if (import.meta.dev) console.log('[SW] init succeeded, triggering download')
      streamInitPendingFiles.delete(meta.id)
      triggerDownload(url)
      flushPendingChunks(meta.id)
      const f = receiveList.value.find((x) => x.id === meta.id)
      if (f?.status === 'done') sw.closeDownload(meta.id)
    } catch (e) {
      if (import.meta.dev) console.warn('[SW] streaming failed, switching to in-memory fallback', e)
      streamInitPendingFiles.delete(meta.id)
      sw.abortDownload(meta.id)
      chunkBuffers.set(meta.id, { chunks: [], received: 0 })
      const pending = pendingChunksMap.get(meta.id)
      if (pending) {
        pendingChunksMap.delete(meta.id)
        for (const buf of pending.chunks) {
          const record = chunkBuffers.get(meta.id)
          if (record) {
            record.chunks.push(new Uint8Array(buf))
            record.received++
          }
        }
      }
      usingFallback = true
    }
  }

  function handleChunkStream(buffer: ArrayBuffer) {
    if (streamInitPendingFiles.has(receiveId)) {
      const record = pendingChunksMap.get(receiveId)
      if (record) {
        record.chunks.push(buffer)
        record.loaded++
      }
      return
    }

    receiveLoaded++
    sw.writeChunk(receiveId, buffer)

    const progress = receiveList.value.find((f) => f.id === receiveId)
    if (progress) progress.loaded = receiveLoaded

    if (receiveLoaded >= receiveTotal) {
      if (import.meta.dev) console.log('[DL] stream complete, closing SW for', receiveId)
      sw.closeDownload(receiveId)
      if (progress) { progress.done = true; progress.status = 'done' }
      if (receiveMeta?.id === receiveId) receiveMeta = null
      channel?.send(JSON.stringify({ msgType: 'file-complete', id: receiveId }))
    }
  }

  function flushPendingChunks(fileId: string) {
    const record = pendingChunksMap.get(fileId)
    if (!record) return
    pendingChunksMap.delete(fileId)

    for (const buf of record.chunks) {
      receiveLoaded++
      sw.writeChunk(fileId, buf)
    }

    const progress = receiveList.value.find((f) => f.id === fileId)
    if (progress) progress.loaded = record.loaded

    if (record.loaded >= record.totalChunks) {
      if (progress) { progress.done = true; progress.status = 'done' }
      if (receiveMeta?.id === fileId) receiveMeta = null
      channel?.send(JSON.stringify({ msgType: 'file-complete', id: fileId }))
    }
  }

  function handleChunkFallback(buffer: ArrayBuffer) {
    const record = chunkBuffers.get(receiveId)
    if (!record) return

    record.chunks.push(new Uint8Array(buffer))
    record.received++

    const progress = receiveList.value.find((f) => f.id === receiveId)
    if (progress) progress.loaded = record.received

    if (record.received >= receiveTotal) {
      if (import.meta.dev) console.log('[DL] fallback complete, triggering download for', receiveMeta!.name)
      const blob = new Blob(record.chunks as BlobPart[], { type: receiveMeta!.type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = receiveMeta!.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
      if (progress) { progress.done = true; progress.status = 'done' }
      receiveMeta = null
      channel?.send(JSON.stringify({ msgType: 'file-complete', id: receiveId }))
    }
  }

  function triggerDownload(url: string) {
    if (import.meta.dev) console.log('[DL] triggering download for', url)
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = url
    document.body.appendChild(iframe)
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 2000)
  }

  function queueFiles(files: File[]) {
    if (!channel || channel.readyState !== 'open') return

    for (const file of files) {
      const id = crypto.randomUUID()
      const chunkSize = calcChunkSize(file.size)
      const totalChunks = Math.ceil(file.size / chunkSize)
      const progress: FileProgress = {
        id, name: file.name, size: file.size, type: file.type, chunkSize,
        loaded: 0, total: totalChunks,
        done: false, status: 'pending', speed: 0,
      }

      pendingFiles.set(id, file)
      sendQueue.value.push(progress)
      try {
        channel.send(JSON.stringify({ msgType: 'file-queued', id, name: file.name, size: file.size, type: file.type }))
      } catch (err) {
        console.error('[FT] failed to queue', file.name, err)
        pendingFiles.delete(id)
        const idx = sendQueue.value.indexOf(progress)
        if (idx !== -1) sendQueue.value.splice(idx, 1)
      }
    }

    processQueue()
  }

  async function sendWithRetry(data: string, retries?: number): Promise<void>
  async function sendWithRetry(data: ArrayBuffer, retries?: number): Promise<void>
  async function sendWithRetry(data: string | ArrayBuffer, retries = 3): Promise<void> {
    for (let attempt = 0; attempt < retries; attempt++) {
      while (channel!.bufferedAmount > 512 * 1024) {
        await new Promise<void>(resolve => setTimeout(resolve, 5))
      }
      try {
        channel!.send(data as any)
        return
      } catch (err) {
        if (attempt < retries - 1) {
          await new Promise<void>(resolve => setTimeout(resolve, 100 * (attempt + 1)))
          continue
        }
        throw err
      }
    }
  }

  async function processQueue() {
    if (isSending.value) return
    isSending.value = true

    while (true) {
      const entry = sendQueue.value.find((f) => f.status === 'pending')
      if (!entry) break

      try {
        entry.status = 'sending'
        const metaBuf = JSON.stringify({ msgType: 'file-begin', id: entry.id, name: entry.name, size: entry.size, type: entry.type, totalChunks: entry.total, chunkSize: entry.chunkSize })

        if (e2ee?.isReady.value) {
          const buf = new TextEncoder().encode(metaBuf)
          await sendWithRetry(await e2ee.encrypt(E2EE_TYPE_META, buf.buffer as ArrayBuffer))
        } else {
          await sendWithRetry(metaBuf)
        }

        if ((entry.status as FileStatus) === 'cancelled') {
          cancelledFiles.delete(entry.id)
          const idx = sendQueue.value.indexOf(entry)
          if (idx !== -1) sendQueue.value.splice(idx, 1)
          continue
        }

        const file = pendingFiles.get(entry.id)
        if (!file) { entry.status = 'done'; continue }
        pendingFiles.delete(entry.id)

        const ackPromise = new Promise<void>(resolve => {
          fileCompleteAcks.set(entry.id, resolve)
        })

        for (let i = 0; i < entry.total; i++) {
          if ((entry.status as FileStatus) === 'cancelled') {
            cancelledFiles.delete(entry.id)
            break
          }
          const offset = i * entry.chunkSize
          const slice = file.slice(offset, offset + entry.chunkSize)
          const buffer = await slice.arrayBuffer()

          const data = e2ee?.isReady.value
            ? await e2ee.encrypt(E2EE_TYPE_CHUNK, buffer)
            : buffer

          await sendWithRetry(data)

          entry.loaded = i + 1
        }

        if ((entry.status as FileStatus) === 'cancelled') {
          cancelledFiles.delete(entry.id)
          const idx = sendQueue.value.indexOf(entry)
          if (idx !== -1) sendQueue.value.splice(idx, 1)
          continue
        }

        await Promise.race([
          ackPromise,
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error(`Ack timeout for ${entry.id}`)), 30000),
          ),
        ]).finally(() => fileCompleteAcks.delete(entry.id))

        entry.done = true
        entry.status = 'done'
      } catch (err) {
        console.error('[FT] send error for', entry.id, err)
        entry.status = 'done'
        entry.done = true
      }
    }

    isSending.value = false

    if (sendQueue.value.some((f) => f.status === 'pending')) {
      processQueue()
    }
  }

  const cancelledFiles = new Set<string>()

  function retryFile(id: string) {
    const file = sendQueue.value.find((f) => f.id === id)
    if (!file || file.status !== 'failed') return

    file.status = 'pending'
    file.loaded = 0
    file.speed = 0

    processQueue()
  }

  function cancelFile(id: string) {
    const file = sendQueue.value.find((f) => f.id === id)
    if (!file) return

    if (file.status === 'pending') {
      pendingFiles.delete(id)
      const idx = sendQueue.value.indexOf(file)
      if (idx !== -1) sendQueue.value.splice(idx, 1)
    } else if (file.status === 'sending') {
      cancelledFiles.add(id)
      file.status = 'cancelled'
    }

    channel?.send(JSON.stringify({ msgType: 'file-cancel', id }))
  }

  function cancelAllPending() {
    const pending = sendQueue.value.filter((f) => f.status === 'pending').map((f) => f.id)
    for (const id of pending) {
      cancelFile(id)
    }
  }

  function clearSent() {
    sendQueue.value = sendQueue.value.filter((f) => f.status !== 'done')
  }

  function clearReceived() {
    receiveList.value = receiveList.value.filter((f) => f.status !== 'done')
  }

  return {
    sendQueue,
    receiveList,
    isSending,
    doneCount,
    setDataChannel,
    queueFiles,
    cancelFile,
    cancelAllPending,
    clearSent,
    clearReceived,
    retryFile,
  }
}
