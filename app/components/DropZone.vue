<script setup lang="ts">
const emit = defineEmits<{
  filesSelected: [files: FileList]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  if (e.dataTransfer?.files.length) {
    emit('filesSelected', e.dataTransfer.files)
  }
}

function onClick() {
  fileInput.value?.click()
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    emit('filesSelected', input.files)
    input.value = ''
  }
}
</script>

<template>
  <div
    class="relative flex flex-col items-center justify-center gap-4 p-12 border rounded-xl transition-all cursor-pointer ring-ring/10 ring-3"
    :class="isDragging
      ? 'border-primary bg-primary/5 scale-[1.02]'
      : 'border-border hover:border-muted-foreground/50'"
    tabindex="0"
    role="button"
    aria-label="Drop files or click to browse"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="onClick"
    @keydown.enter="onClick"
    @keydown.space.prevent="onClick"
  >

    <div class="text-center">
      <p class="text-sm font-medium text-foreground">
        Drop files here
      </p>
      <p class="text-xs text-muted-foreground mt-1">
        or click to browse
      </p>
    </div>
    <p class="text-xs text-muted-foreground mt-2">
      Files transfer directly. No size limit.
    </p>
    <input
      ref="fileInput"
      type="file"
      multiple
      class="hidden"
      @change="onFileInput"
    />
  </div>
</template>
