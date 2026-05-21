const streams = new Map()
const pendingBuffers = new Map()
const pendingCloses = new Map()

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('message', (event) => {
  const { type, fileId, fileName, fileSize, fileType, chunk } = event.data

  switch (type) {
    case 'init-stream':
      console.log('[SW] init-stream', fileId)
      streams.set(fileId, { fileName, fileSize, fileType, controller: null })
      event.source.postMessage({ type: 'stream-ready', fileId })
      break

    case 'write-chunk': {
      const data = new Uint8Array(chunk)
      const entry = streams.get(fileId)
      if (entry?.controller) {
        entry.controller.enqueue(data)
      } else {
        if (!pendingBuffers.has(fileId)) pendingBuffers.set(fileId, [])
        pendingBuffers.get(fileId).push(data)
      }
      break
    }

    case 'close-stream': {
      console.log('[SW] close-stream', fileId)
      const entry = streams.get(fileId)
      if (entry?.controller) {
        entry.controller.close()
        streams.delete(fileId)
        pendingBuffers.delete(fileId)
      } else {
        pendingCloses.set(fileId, true)
      }
      break
    }

    case 'abort-stream': {
      const entry = streams.get(fileId)
      if (entry?.controller) entry.controller.error(new Error('Transfer aborted'))
      streams.delete(fileId)
      pendingBuffers.delete(fileId)
      pendingCloses.delete(fileId)
      break
    }
  }
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const m = url.pathname.match(/^\/sw-download\/(.+)$/)
  if (!m) return

  const fileId = m[1]
  console.log('[SW] fetch for', fileId)
  const entry = streams.get(fileId)
  if (!entry) {
    console.log('[SW] fetch but no entry for', fileId)
    return
  }

  let controller
  const stream = new ReadableStream({
    start(c) { controller = c },
    cancel() {
      streams.delete(fileId)
      pendingBuffers.delete(fileId)
      pendingCloses.delete(fileId)
    },
  })

  entry.controller = controller

  const pending = pendingBuffers.get(fileId)
  if (pending) {
    for (const buf of pending) controller.enqueue(buf)
    pendingBuffers.delete(fileId)
  }

  if (pendingCloses.has(fileId)) {
    controller.close()
    pendingCloses.delete(fileId)
    streams.delete(fileId)
    pendingBuffers.delete(fileId)
  }

  const fn = encodeURIComponent(entry.fileName)
  event.respondWith(
    new Response(stream, {
      headers: {
        'Content-Type': entry.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${fn}`,
        'Content-Length': String(entry.fileSize),
      },
    })
  )
})
