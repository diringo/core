<script setup lang="ts">
const props = defineProps<{
  sessionCode: string
}>()

const emit = defineEmits<{
  leave: []
}>()

const qrContainer = ref<HTMLDivElement | null>(null)
const qrReady = ref(false)
const copied = ref(false)
const { vibrate } = useHaptic()

function textImageDataURL(code: string): string {
  const c = document.createElement('canvas')
  c.width = 120
  c.height = 40
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 120, 40)
  ctx.fillStyle = '#222'
  ctx.font = 'bold 18px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(code.toUpperCase(), 60, 20)
  return c.toDataURL()
}

onMounted(async () => {
  const { default: QRCodeStyling } = await import('qr-code-styling')
  const url = `${window.location.origin}/s/${props.sessionCode}`
  const qrCode = new QRCodeStyling({
    width: 176,
    height: 176,
    data: url,
    image: textImageDataURL(props.sessionCode),
    dotsOptions: {
      type: 'dots',
      color: '#222',
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#222',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#222',
    },
    backgroundOptions: {
      color: '#fff',
    },
    imageOptions: {
      imageSize: 0.5,
      margin: 0,
      hideBackgroundDots: true,
    },
    qrOptions: {
      errorCorrectionLevel: 'H',
    },
  })
  if (qrContainer.value) {
    qrCode.append(qrContainer.value)
    qrReady.value = true
  }
})

async function copyCode() {
  await navigator.clipboard.writeText(props.sessionCode)
  copied.value = true
  vibrate([10])
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-6">
    <p class="text-sm text-muted-foreground">Share this code</p>

    <div class="bg-white p-3 rounded-xl">
      <div ref="qrContainer" class="size-44 flex items-center justify-center overflow-hidden rounded-xl">
        <div v-if="!qrReady" class="size-44 rounded-xl bg-muted animate-pulse" />
      </div>
    </div>

    <div class="flex items-center gap-3">
      <Button variant="default" size="sm" @click="copyCode" class="min-w-28a">
        <template v-if="copied">
          <Icon name="solar:check-circle-bold" class="size-4 text-green-300" />
          Copied!
        </template>
        <template v-else>
          <Icon name="solar:copy-bold" class="size-4" />
          Copy
        </template>
      </Button>
      <div>|</div>
      <Button variant="link" class="px-0" @click="$emit('leave')">
        Leave
      </Button>
    </div>
  </div>
</template>
