<script setup lang="ts">
defineProps<{
    localSeed: string
    remoteSeed?: string
    state: 'connecting' | 'connected' | 'disconnected'
    encrypted: boolean
}>()
</script>

<template>
    <div class="flex items-center justify-center gap-3 py-2">
        <PeerAvatar :seed="localSeed" :size="40" />

        <div class="relative flex items-center">
            <div class="w-full min-w-24 h-px rounded-full transition-colors duration-500" :class="{
                'bg-green-500': state === 'connected',
                'bg-yellow-500 animate-pulse': state === 'connecting',
                'bg-muted-foreground/40': state === 'disconnected',
            }" />
            <div v-if="encrypted && state === 'connected'"
                class="bg-background px-0.5 absolute left-1/2 -translate-x-1/2">
                <Icon name="solar:lock-keyhole-minimalistic-bold-duotone" class="size-4 text-green-500 rounded-sm" />
            </div>
        </div>

        <PeerAvatar v-if="remoteSeed" :seed="remoteSeed" :size="40" />
        <div v-else
            class="size-10 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <Icon name="solar:question-mark-bold" class="size-4 text-muted-foreground/50" />
        </div>
    </div>
</template>
