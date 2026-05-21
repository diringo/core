<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
  modelValue?: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  emit("update:modelValue", target.value)
}
</script>

<template>
  <textarea
    data-slot="textarea"
    :value="modelValue"
    @input="onInput"
    :class="cn(
      'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
      props.class,
    )"
  />
</template>
