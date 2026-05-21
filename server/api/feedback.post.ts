export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    email: string
    message: string
  }>(event)

  if (!body || !body.email || !body.email.includes('@')) {
    throw createError({ statusCode: 400, message: 'Valid email is required' })
  }
  if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
    throw createError({ statusCode: 400, message: 'Message is required' })
  }

  const db = await getDb()
  await db('feedback').insert({
    name: body.name?.trim() || null,
    email: body.email.trim(),
    message: body.message.trim(),
  })

  return { ok: true }
})
