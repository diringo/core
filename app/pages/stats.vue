<script setup lang="ts">
import { formatFileSize } from '@/lib/utils'

interface DailyRow {
    date: string
    created: number
    joined: number
    files: number
    transfers: number
}

interface Stats {
    visitors: number
    pageViews: number
    sessionsCreated: number
    sessionsJoined: number
    filesSent: number
    filesReceived: number
    transfersCompleted: number
    totalBytesTransferred: number
    avgFileSizeBytes: number
    chatSent: number
    chatReceived: number
    daily: DailyRow[]
}

useColorMode()

const { data, error } = await useFetch<Stats>('/api/stats')

function n(v: number | undefined): string {
    return v?.toLocaleString() ?? '—'
}

const filesTransferred = computed(() => Math.max(data.value?.filesSent ?? 0, data.value?.filesReceived ?? 0))

interface Metric {
    label: string
    value: string | number
}

const metrics = computed<Metric[]>(() => {
    if (!data.value) return []
    return [
        { label: 'Page views', value: n(data.value.pageViews) },
        { label: 'Sessions created', value: n(data.value.sessionsCreated) },
        { label: 'Sessions joined', value: n(data.value.sessionsJoined) },
        { label: 'Files transferred', value: n(filesTransferred.value) },
        { label: 'Transfers completed', value: n(data.value.transfersCompleted) },
        { label: 'Total transferred', value: formatFileSize(data.value.totalBytesTransferred) },
        { label: 'Chat sent', value: n(data.value.chatSent) },
        { label: 'Chat received', value: n(data.value.chatReceived) },
    ]
})
</script>

<template>
    <main class="max-w-2xl mx-auto px-4 py-4">
        <NuxtLink to="/"
            class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
            <Icon name="solar:arrow-left-bold" class="size-3" />
            Back to {{ useRuntimeConfig().public.brandName }}
        </NuxtLink>

        <h1 class="text-lg font-semibold mb-6">Stats</h1>

        <div v-if="error" class="text-sm text-destructive">Failed to load stats.</div>

        <template v-if="data">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div v-for="m in metrics" :key="m.label"
                    class="border rounded-md p-4 text-center ring-3 ring-ring/10">

                    <p class="text-xl font-bold leading-tight">{{ m.value }}</p>
                    <p class="text-xs text-muted-foreground">{{ m.label }}</p>
                </div>
            </div>

            <p v-if="data.avgFileSizeBytes" class="text-xs text-muted-foreground mb-6">
                Average file size: {{ formatFileSize(data.avgFileSizeBytes) }}
            </p>

            <div v-if="data.daily.length">
                <h2 class="text-sm font-medium mb-3">Daily activity</h2>
                <div class="border rounded-md overflow-hidden ring-3 ring-ring/10">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b bg-muted/30 text-xs text-muted-foreground">
                                <th class="text-left py-2.5 px-4 font-medium">Date</th>
                                <th class="text-right py-2.5 px-4 font-medium">Created</th>
                                <th class="text-right py-2.5 px-4 font-medium">Joined</th>
                                <th class="text-right py-2.5 px-4 font-medium">Files</th>
                                <th class="text-right py-2.5 px-4 font-medium">Transfers</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(row, i) in data.daily" :key="row.date" class="border-b last:border-0"
                                :class="i % 2 === 0 ? 'bg-background' : 'bg-muted/10'">
                                <td class="py-2.5 px-4 font-mono text-xs">{{ row.date }}</td>
                                <td class="text-right py-2.5 px-4">{{ n(row.created) }}</td>
                                <td class="text-right py-2.5 px-4">{{ n(row.joined) }}</td>
                                <td class="text-right py-2.5 px-4">{{ n(row.files) }}</td>
                                <td class="text-right py-2.5 px-4">{{ n(row.transfers) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <p v-else class="text-xs text-muted-foreground">
                No activity in the last 14 days.
            </p>
        </template>
    </main>
</template>
