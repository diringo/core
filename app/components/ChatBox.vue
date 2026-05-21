<script setup lang="ts">
import type { ChatMessage } from '@/composables/useChat'

const props = defineProps<{
  messages: ChatMessage[]
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const input = ref('')
const list = ref<HTMLDivElement | null>(null)

watch(
  () => props.messages.length,
  () => {
    nextTick(() => {
      list.value?.scrollTo({ top: list.value.scrollHeight, behavior: 'smooth' })
    })
  },
)

function onSubmit() {
  const text = input.value.trim()
  if (!text) return
  emit('send', text)
  input.value = ''
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col h-100 border rounded-xl overflow-hidden ring-ring/10 ring-3">
    <div
      ref="list"
      class="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
    >
      <p
        v-if="messages.length === 0"
        class="text-xs text-muted-foreground text-center pt-12"
      >
        No messages yet
      </p>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex"
        :class="msg.sender === 'you' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[80%] rounded-xl px-3 py-2 text-sm"
          :class="msg.sender === 'you'
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'"
        >
          <p class="whitespace-pre-wrap wrap-break-word">{{ msg.text }}</p>
          <p
            class="text-[10px] mt-0.5 opacity-60"
            :class="msg.sender === 'you' ? 'text-right' : 'text-left'"
          >
            {{ formatTime(msg.timestamp) }}
          </p>
        </div>
      </div>
    </div>

    <form
      class="flex items-center gap-2 border-t p-3"
      @submit.prevent="onSubmit"
    >
      <Input
        v-model="input"
        placeholder="Type a message..."
        class="flex-1 focus-visible:ring-ring/10 focus-visible:ring-3"
      />
      <Button type="submit" size="icon" :disabled="!input.trim()">
        <Icon name="solar:arrow-up-bold-duotone" class="size-4" size="16" />
      </Button>
    </form>
  </div>
</template>
