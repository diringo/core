<script setup lang="ts">
import type { PopoverContentEmits, PopoverContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { PopoverContent, PopoverPortal, useForwardPropsEmits } from "reka-ui"
import { cn } from "@/lib/utils"

const props = withDefaults(
  defineProps<PopoverContentProps & { class?: HTMLAttributes["class"] }>(),
  { align: "center", sideOffset: 4 },
)
const emits = defineEmits<PopoverContentEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      v-bind="forwarded"
      :class="
        cn(
          'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
          props.class,
        )
      "
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>
