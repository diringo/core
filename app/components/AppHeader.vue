<script setup lang="ts">
const { colorMode, toggle } = useColorMode()
const config = useRuntimeConfig()
</script>

<template>
<div class="flex items-center justify-between mb-8">
    <div class="flex items-center gap-2">
        <div class="text-foreground flex items-center bg-linear-to-br from-zinc-100 to-white border border-zinc-200 p-1 rounded-sm dark:from-zinc-800 dark:to-zinc-900 dark:border-zinc-700">
            <a class="flex text-sm" :href="config.public.brandUrl">
                <span class="px-1 text-zinc-600 dark:text-zinc-400">{{ config.public.brandName }}</span>
            </a>
        </div>
    </div>

    <div class="flex items-center gap-3">
      <a href="https://github.com/diringo/core" target="_blank" rel="noopener noreferrer" class="text-muted-foreground hover:text-foreground transition-colors" title="GitHub">
        <Icon name="simple-icons:github" class="size-4" />
      </a>
      <button
        @click="toggle"
        class="text-muted-foreground hover:text-foreground transition-colors"
        :title="colorMode === 'system' ? 'System' : colorMode === 'dark' ? 'Dark' : 'Light'"
      >
        <Icon v-if="colorMode === 'dark'" name="solar:moon-stars-bold" class="size-4" />
        <Icon v-else-if="colorMode === 'light'" name="solar:sun-2-bold" class="size-4" />
        <Icon v-else name="solar:monitor-bold" class="size-4" />
      </button>
      <NuxtLink to="/feedback" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Give feedback
      </NuxtLink>
    </div>
</div>
</template>
