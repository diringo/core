<script setup lang="ts">
const props = withDefaults(defineProps<{
    seed: string
    size?: number
}>(), { size: 32 })

const url = computed(() =>
    `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(props.seed)}`
)
</script>

<template>
    <img :src="url" :width="props.size" :height="props.size" class="rounded-full bg-muted shrink-0" alt="" />
</template>
