<script setup lang="ts">
import type { FileProgress } from '@/composables/useFileTransfer'
import { formatFileSize, formatSpeed } from '@/lib/utils'

const props = defineProps<{
    file: FileProgress
    seed?: string
    direction?: 'send' | 'receive'
}>()

const emit = defineEmits<{
    cancel: [id: string]
    retry: [id: string]
}>()

const loadedBytes = computed(() => Math.min(props.file.loaded * props.file.chunkSize, props.file.size))
const displayPercent = computed(() => props.file.total > 0 ? Math.round((props.file.loaded / props.file.total) * 100) : 0)

function fileIcon(type: string): string {
    if (type.startsWith('image/')) return 'solar:gallery-bold'
    if (type.startsWith('video/')) return 'solar:videocamera-record-bold'
    if (type.startsWith('audio/')) return 'solar:music-notes-bold'
    if (type.includes('pdf')) return 'solar:document-text-bold'
    if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return 'solar:archive-bold'
    return 'solar:document-bold'
}

function statusLabel(status: string): string {
    if (status === 'pending') return 'Pending'
    if (status === 'sending') return props.direction === 'receive' ? 'Receiving' : 'Sending'
    if (status === 'done') return 'Done'
    if (status === 'failed') return 'Failed'
    return ''
}
</script>

<template>
<div class="flex items-stretch gap-1 bg-card border rounded-lg overflow-hidden">
    <div class="px-3.5 shrink-0 text-primary bg-primary/5 items-center flex">
        <Icon class="my-auto"
            :name="direction === 'send' ? 'solar:upload-minimalistic-line-duotone' : 'solar:download-minimalistic-line-duotone'"
            size="20" />
    </div>

    <div class="flex-1 min-w-0 p-2">
        <div class="flex items-center gap-2">
            <p class="text-sm font-medium truncate text-foreground">{{ file.name }}</p>
            <span class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded" :class="{
                'bg-muted text-muted-foreground': file.status === 'pending',
                'bg-primary/10 text-primary': file.status === 'sending',
                'bg-green-500/10 text-green-600': file.status === 'done',
                'bg-red-500/10 text-red-600': file.status === 'failed',
            }">
                {{ statusLabel(file.status) }}
            </span>
        </div>
        <p v-if="file.status === 'sending'" class="text-xs text-muted-foreground">
            {{ formatFileSize(loadedBytes) }} of {{ formatFileSize(file.size) }} ({{ displayPercent }}%) · {{
                formatSpeed(file.speed) }}
        </p>
        <p v-else class="text-xs text-muted-foreground">{{ formatFileSize(file.size) }}</p>
        <div v-if="file.status === 'sending' && !file.done" class="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              class="h-full bg-primary transition-all"
              :style="{ width: `${file.total > 0 ? (file.loaded / file.total) * 100 : 0}%` }"
              role="progressbar"
              :aria-valuenow="displayPercent"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="`${file.name}: ${displayPercent}%`"
            />
        </div>
    </div>
    <div class="shrink-0 flex items-center gap-1 pr-4">
        <Icon v-if="file.status === 'done'" name="solar:check-circle-bold" class="size-5 text-green-500" />
        <button v-if="file.status === 'failed' && direction === 'send'"
            class="size-6 flex items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-colors"
            @click="emit('retry', file.id)" title="Retry">
            <Icon name="solar:refresh-bold" class="size-4" />
        </button>
        <button v-if="(file.status === 'pending' || file.status === 'sending') && direction === 'send'"
            class="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            @click="emit('cancel', file.id)" title="Cancel">
            <Icon name="solar:close-circle-bold" class="size-4" />
        </button>
    </div>
</div>
</template>
