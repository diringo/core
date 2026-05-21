<script setup lang="ts">
defineProps<{
  error?: string
}>()

const emit = defineEmits<{
  createSession: []
  joinSession: [code: string]
}>()

const joinCode = ref('')

function onCreate() {
  emit('createSession')
}

function onJoin() {
  const code = joinCode.value.trim().toLowerCase()
  if (code.length < 4) return
  emit('joinSession', code)
}
</script>

<template>
<div class="flex flex-col items-center gap-10 py-12">
    <div class="flex flex-col items-center gap-3 text-center">
        <h1 class="text-2xl font-semibold text-foreground">Share files directly</h1>
        <p class="text-sm text-muted-foreground max-w-sm">
            Browser-to-browser with end-to-end encryption. No cloud, no account, no trace.
        </p>
    </div>

    <div class="flex flex-col items-center gap-6 w-full max-w-sm">
        <Button size="lg" class="w-full text-sm" @click="onCreate">
            Create a Session
        </Button>

        <div class="flex items-center gap-3 w-full">
            <div class="flex-1 h-px bg-border" />
            <span class="text-xs text-muted-foreground">or join one</span>
            <div class="flex-1 h-px bg-border" />
        </div>

        <form class="flex gap-2 w-full" @submit.prevent="onJoin">
            <Input v-model="joinCode" placeholder="Enter code" minlength="4" maxlength="20"
                class="flex-1 text-center font-mono uppercase tracking-widest" />
            <Button type="submit" variant="default" :disabled="joinCode.trim().length < 4">
                <Icon name="solar:arrow-right-bold" class="size-3" />
            </Button>
        </form>

        <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    </div>
</div>
</template>
