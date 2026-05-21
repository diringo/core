export default defineEventHandler(async (event) => {
  const body = await readBody<{
    event: string
    data?: Record<string, unknown>
  }>(event)

  if (!body || !body.event) {
    throw createError({ statusCode: 400, message: 'Missing event type' })
  }

  const db = await getDb()
  const today = new Date().toISOString().split('T')[0]
  const data = body.data ?? {}
  const size = typeof data.size === 'number' ? data.size : null
  const totalBytes = typeof data.totalBytes === 'number' ? data.totalBytes : null

  await db('analytics_counts')
    .insert({ event: body.event, count: 1 })
    .onConflict('event')
    .merge({ count: db.raw('analytics_counts.count + 1') })

  await db('analytics_daily')
    .insert({ date: today, event: body.event, count: 1 })
    .onConflict(['date', 'event'])
    .merge({ count: db.raw('analytics_daily.count + 1') })

  if (body.event === 'file_sent' && size) {
    await db('analytics_totals')
      .insert({ metric: 'total_bytes', value: size })
      .onConflict('metric')
      .merge({ value: db.raw('analytics_totals.value + ?', [size]) })

    await db('analytics_totals')
      .insert({ metric: 'file_count', value: 1 })
      .onConflict('metric')
      .merge({ value: db.raw('analytics_totals.value + 1') })
  }

  if (body.event === 'transfer_complete' && totalBytes) {
    await db('analytics_totals')
      .insert({ metric: 'transfer_bytes', value: totalBytes })
      .onConflict('metric')
      .merge({ value: db.raw('analytics_totals.value + ?', [totalBytes]) })
  }

  return { ok: true }
})
