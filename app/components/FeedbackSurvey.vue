<script setup lang="ts">
const emit = defineEmits<{
  submitted: []
}>()

const email = ref('')
const message = ref('')
const error = ref('')
const submitted = ref(false)
const submitting = ref(false)

onMounted(() => {
  if (import.meta.client && localStorage.getItem('diringo_feedback_done')) {
    submitted.value = true
    emit('submitted')
  }
})

async function submitForm() {
  error.value = ''
  if (!email.value.trim() || !email.value.includes('@')) {
    error.value = 'Enter a valid email'
    return
  }
  if (!message.value.trim()) {
    error.value = 'Tell us what feature you\'d like'
    return
  }

  submitting.value = true
  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: { email: email.value.trim(), message: message.value.trim() },
    })
    if (import.meta.client) localStorage.setItem('diringo_feedback_done', 'true')
    submitted.value = true
    emit('submitted')
  } catch {
    error.value = 'Something went wrong. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Card v-if="!submitted" class="mt-6">
    <CardHeader>
      <CardTitle class="text-sm">What feature should we build next?</CardTitle>
      <CardDescription class="text-xs">Your feedback helps shape the roadmap.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input id="email" v-model="email" type="email" placeholder="you@example.com" />
      </div>
      <div class="space-y-2">
        <Label for="message">Feature request</Label>
        <Textarea id="message" v-model="message" placeholder="Describe the feature you'd like to see..." rows="3" />
      </div>
      <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    </CardContent>
    <CardFooter>
      <Button class="w-full" :disabled="submitting" @click="submitForm">
        <Icon v-if="submitting" name="solar:refresh-circle-bold" class="size-4 mr-2 animate-spin" />
        <Icon v-else name="solar:chat-round-like-bold" class="size-4 mr-2" />
        {{ submitting ? 'Sending...' : 'Send Feedback' }}
      </Button>
    </CardFooter>
  </Card>

  <Card v-else class="mt-6">
    <CardContent class="flex flex-col items-center gap-2 py-6 text-center">
      <Icon name="solar:confetti-minimalistic-bold" class="size-8 text-primary" />
      <CardTitle class="text-sm">Thanks for your feedback!</CardTitle>
      <CardDescription class="text-xs">We read every message.</CardDescription>
    </CardContent>
  </Card>
</template>
