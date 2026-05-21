export default defineEventHandler(async () => {
  const db = await getDb()

  const countRows = await db('analytics_counts').select('event', 'count') as { event: string; count: number }[]
  const getCount = (event: string) => Number(countRows.find(r => r.event === event)?.count ?? 0)

  const totals = await db('analytics_totals').select('metric', 'value') as { metric: string; value: number }[]
  const getTotal = (metric: string) => Number(totals.find(r => r.metric === metric)?.value ?? 0)

  const totalBytes = getTotal('transfer_bytes')
  const fileBytes = getTotal('total_bytes')
  const fileCount = getTotal('file_count')
  const avgFileSize = fileCount > 0 ? Math.round(fileBytes / fileCount) : 0

  const daily = await db('analytics_daily')
    .select('date')
    .select(db.raw("SUM(count) FILTER (WHERE event = 'session_created') AS created"))
    .select(db.raw("SUM(count) FILTER (WHERE event = 'session_joined') AS joined"))
    .select(db.raw("SUM(count) FILTER (WHERE event = 'file_sent') AS files"))
    .select(db.raw("SUM(count) FILTER (WHERE event = 'transfer_complete') AS transfers"))
    .where('date', '>', db.raw("NOW() - INTERVAL '14 days'"))
    .groupBy('date')
    .orderBy('date', 'asc') as { date: string; created: number; joined: number; files: number; transfers: number }[]

  return {
    pageViews: getCount('page_view'),
    sessionsCreated: getCount('session_created'),
    sessionsJoined: getCount('session_joined'),
    filesSent: getCount('file_sent'),
    filesReceived: getCount('file_received'),
    transfersCompleted: getCount('transfer_complete'),
    chatSent: getCount('chat_sent'),
    chatReceived: getCount('chat_received'),
    totalBytesTransferred: totalBytes,
    avgFileSizeBytes: avgFileSize,
    daily: daily.map(d => ({
      date: d.date,
      created: Number(d.created),
      joined: Number(d.joined),
      files: Number(d.files),
      transfers: Number(d.transfers),
    })),
  }
})
