<script setup lang="ts">
import type { FileProgress } from '@/composables/useFileTransfer'
import { Button } from '@/components/ui/button'

defineProps<{
    files: FileProgress[]
    title?: string
    seed?: string
    direction?: 'send' | 'receive'
}>()

const emit = defineEmits<{
    cancel: [id: string]
    retry: [id: string]
    clear: []
}>()
</script>

<template>
<div v-if="files.length" class="space-y-2">
    <div v-if="title" class="flex items-center justify-between">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {{ title }}
        </p>
        <Button v-if="title === 'Sent' || title === 'Received'" variant="ghost" size="sm"
            class="h-6 text-xs text-primary/60 px-2" @click="emit('clear')">
            Clear
        </Button>
    </div>
    <FileCard v-for="file in files" :key="file.id" :file="file" :seed="seed" :direction="direction"
        @cancel="(id) => emit('cancel', id)"
        @retry="(id) => emit('retry', id)" />
</div>
</template>
