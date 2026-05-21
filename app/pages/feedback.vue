<script setup lang="ts">
const name = ref('')
const email = ref('')
const message = ref('')
const error = ref('')
const submitted = ref(false)
const submitting = ref(false)

async function submitForm() {
    error.value = ''

    if (!email.value.trim() || !email.value.includes('@')) {
        error.value = 'Enter a valid email address'
        return
    }
    if (!message.value.trim()) {
        error.value = 'Enter a message'
        return
    }

    submitting.value = true
    try {
        const res = await $fetch('/api/feedback', {
            method: 'POST',
            body: {
                name: name.value.trim() || undefined,
                email: email.value.trim(),
                message: message.value.trim(),
            },
        })
        if (res.ok) {
            submitted.value = true
        }
    } catch (e: any) {
        error.value = e?.data?.message || 'Something went wrong. Try again.'
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <div class="max-w-lg mx-auto px-4 py-4">
        <AppHeader />

        <Card v-if="!submitted" class="shadow-none border ring-3 ring-ring/10">
            <CardHeader>
                <CardTitle>Give Feedback</CardTitle>
                <CardDescription>
                    Help us improve {{ useRuntimeConfig().public.brandName }}. Your feedback is read by a human.
                </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
                <div class="space-y-2">
                    <Label for="name">Name <span class="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input id="name" v-model="name" type="text" placeholder="Your name" />
                </div>
                <div class="space-y-2">
                    <Label for="email">Email</Label>
                    <Input id="email" v-model="email" type="email" placeholder="you@example.com" />
                </div>
                <div class="space-y-2">
                    <Label for="message">Message</Label>
                    <Textarea id="message" v-model="message" placeholder="What's on your mind?" rows="4" />
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

        <Card v-else>
            <CardContent class="flex flex-col items-center gap-2 py-6 text-center">
                <Icon name="solar:confetti-minimalistic-bold" class="size-8 text-primary" />
                <CardTitle class="text-sm">Thanks for your feedback!</CardTitle>
                <CardDescription class="text-xs">We read every message.</CardDescription>
                <Button variant="outline" class="mt-4" as-child>
                    <NuxtLink to="/">Back to {{ useRuntimeConfig().public.brandName }}</NuxtLink>
                </Button>
            </CardContent>
        </Card>
    </div>
</template>
