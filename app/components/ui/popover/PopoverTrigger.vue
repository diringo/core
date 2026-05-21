<script setup lang="ts">
import type { PopoverTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { PopoverTrigger } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<PopoverTriggerProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <PopoverTrigger v-bind="delegatedProps" :class="cn(props.class)">
    <slot />
  </PopoverTrigger>
</template>
