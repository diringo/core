<script setup lang="ts">
import { formatFileSize } from '@/lib/utils'

const session = useSession()

const { sessionCode, sessionState, error, createSession, joinSession, reset, e2ee, localPeerId, peerId } = session
const { sendQueue, receiveList, doneCount, clearSent, clearReceived } = session.fileTransfer
const { messages, unread, sendMessage } = session.chat

const config = useRuntimeConfig()

const activeTab = ref('files')

const { track } = useTracking()
const { vibrate } = useHaptic()
const { requestPermission, notify } = useNotification()
const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock()

function onSend(text: string) {
  track('chat_sent')
  sendMessage(text)
}

watch(activeTab, (tab) => {
  if (tab === 'chat') unread.value = 0
})

const route = useRoute()

onMounted(() => {
  track('page_view')

  const code = route.query.join as string | undefined
  if (code) {
    window.history.replaceState({}, '', '/')
    joinSession(code)
    requestPermission()
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' &&
        (sessionState.value === 'connected' || sessionState.value === 'waiting')) {
      requestWakeLock()
    }
  })
})

function onCreateSession() {
  createSession()
  requestPermission()
}

function onJoinSession(code: string) {
  joinSession(code)
  requestPermission()
}

function handleFiles(files: FileList) {
  const fileArray = Array.from(files)
  for (const f of fileArray) {
    track('file_sent', { size: f.size, ext: f.name.split('.').pop() })
  }
  session.fileTransfer.queueFiles(fileArray)
}

watch(sessionState, (next, prev) => {
  if (prev === 'creating' && next === 'waiting') track('session_created')
  if (prev === 'joining' && next === 'connecting') track('session_joined')
  if (prev === 'connecting' && next === 'connected') {
    vibrate([20])
    notify('Peer connected', { body: 'Someone joined your session' })
  }
  if (next === 'connected' || next === 'waiting' || next === 'connecting') {
    requestWakeLock()
  } else {
    releaseWakeLock()
  }
})

watch(receiveList, (list) => {
  if (sessionState.value !== 'connected') return
  const incomplete = list.find((f) => !f.done)
  if (!incomplete && list.length > 0) {
    const totalBytes = [...sendQueue.value, ...receiveList.value].reduce((s, f) => s + (f.size || 0), 0)
    track('transfer_complete', { fileCount: doneCount.value, totalBytes })
  }
}, { deep: true })

const trackedReceived = new Set<string>()
watch(receiveList, (list) => {
  for (const f of list) {
    if (f.done && !trackedReceived.has(f.id)) {
      trackedReceived.add(f.id)
      track('file_received', { size: f.size })
      vibrate([15, 50, 15])
      const label = `${f.name} (${formatFileSize(f.size)})`
      notify('File received', { body: label })
    }
  }
}, { deep: true })

const trackedSent = new Set<string>()
watch(sendQueue, (list) => {
  for (const f of list) {
    if (f.done && !trackedSent.has(f.id)) {
      trackedSent.add(f.id)
      vibrate([15])
    }
  }
}, { deep: true })

watch(doneCount, (count) => {
  const total = sendQueue.value.length + receiveList.value.length
  if (total > 0 && count === total) {
    vibrate([15, 50, 15, 50, 30])
    notify('Transfer complete', { body: 'All files have been transferred' })
  }
})

const trackedChatIds = new Set<string>()
watch(messages, (list) => {
  for (const m of list) {
    if (m.sender === 'peer' && !trackedChatIds.has(m.id)) {
      trackedChatIds.add(m.id)
      track('chat_received')
    }
  }
}, { deep: true })

const sendingFiles = computed(() => sendQueue.value.filter(f => !f.done && f.status !== 'failed'))
const sentFiles = computed(() => sendQueue.value.filter(f => f.done || f.status === 'failed'))
const receivingFiles = computed(() => receiveList.value.filter(f => !f.done))
const receivedFiles = computed(() => receiveList.value.filter(f => f.done))

useHead({
  title: computed(() => {
    const s = sessionState.value
    if (s === 'idle') return config.public.brandName
    if (s === 'creating' || s === 'joining') return `Connecting... — ${config.public.brandName}`
    if (s === 'waiting') return `Waiting for peer... — ${config.public.brandName}`
    if (s === 'connecting') return `Peer joined — connecting... — ${config.public.brandName}`
    if (s === 'connected') {
      const sending = sendingFiles.value.length
      const receiving = receivingFiles.value.length
      if (sending > 0 || receiving > 0) {
        return `⬆${sending} ⬇${receiving} — ${config.public.brandName}`
      }
      return `Connected — ${config.public.brandName}`
    }
    if (s === 'disconnected') return `Disconnected — ${config.public.brandName}`
    return config.public.brandName
  }),
})

</script>

<template>
    <main id="main-content" class="max-w-lg mx-auto px-4 py-4">
      <AppHeader />
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm"
      >
        Skip to content
      </a>

      <Transition name="fade" mode="out-in">
        <div v-if="sessionState === 'idle'" class="space-y-4">
          <SessionJoin
            :error="error"
            @create-session="onCreateSession"
            @join-session="onJoinSession"
          />
        </div>

        <div v-else-if="sessionState === 'creating' || sessionState === 'joining'" class="flex flex-col items-center gap-4 py-20">
          <Icon name="solar:refresh-circle-bold" class="size-10 text-primary animate-spin" />
          <p class="text-sm text-muted-foreground">
            {{ sessionState === 'creating' ? 'Creating session' : 'Joining session' }}
          </p>
        </div>

        <div v-else-if="sessionState === 'waiting'" class="flex flex-col items-center gap-6">
          <ConnectionVisual
            :local-seed="localPeerId"
            state="connecting"
            :encrypted="e2ee.isReady"
          />
          <SessionCodeCard :session-code="sessionCode" @leave="reset" />
        </div>

        <div v-else-if="sessionState === 'connecting'" class="flex flex-col items-center gap-6">
          <ConnectionVisual
            :local-seed="localPeerId"
            :remote-seed="peerId"
            state="connecting"
            :encrypted="e2ee.isReady"
          />
          <p class="text-sm text-muted-foreground">Establishing encrypted connection…</p>
        </div>

        <div v-else-if="sessionState === 'connected'" class="space-y-4">
          <ConnectionVisual
            :local-seed="localPeerId"
            :remote-seed="peerId"
            state="connected"
            :encrypted="e2ee.isReady"
          />

          <Tabs v-model="activeTab" class="w-full">
            <TabsList class="w-full">
              <TabsTrigger value="files" class="flex-1">Files</TabsTrigger>
              <TabsTrigger value="chat" class="flex-1 relative">
                Chat
                <span
                  v-if="unread && activeTab === 'files'"
                  class="absolute -top-1 -right-1 size-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center"
                >
                  {{ unread }}
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="files" class="space-y-4 mt-4">
              <DropZone @files-selected="handleFiles" />
              <FileList v-if="sendingFiles.length" :files="sendingFiles" title="Sending" direction="send" :seed="localPeerId" @cancel="session.fileTransfer.cancelFile" @retry="session.fileTransfer.retryFile" />
              <FileList v-if="sentFiles.length" :files="sentFiles" title="Sent" direction="send" :seed="localPeerId" @clear="clearSent" />
              <FileList v-if="receivingFiles.length" :files="receivingFiles" title="Receiving" direction="receive" :seed="peerId" />
              <FileList v-if="receivedFiles.length" :files="receivedFiles" title="Received" direction="receive" :seed="peerId" @clear="clearReceived" />
            </TabsContent>
            <TabsContent value="chat" class="mt-4">
              <ChatBox :messages="messages" @send="onSend" />
            </TabsContent>
          </Tabs>
        </div>

        <div v-else-if="sessionState === 'disconnected'" class="space-y-4">
          <div class="flex flex-col items-center gap-4">
            <ConnectionVisual
              :local-seed="localPeerId"
              :remote-seed="peerId"
              state="disconnected"
              :encrypted="e2ee.isReady"
            />
            <Button variant="outline" size="sm" @click="reset">New Transfer</Button>
          </div>
<FileList v-if="sentFiles.length" :files="sentFiles" title="Sent" direction="send" :seed="localPeerId" @clear="clearSent" />
              <FileList v-if="receivedFiles.length" :files="receivedFiles" title="Received" direction="receive" :seed="peerId" @clear="clearReceived" />
        </div>

      </Transition>
    </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
