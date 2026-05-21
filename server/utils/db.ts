import knex from 'knex'

let db: knex.Knex | null = null
let ready: Promise<void> | null = null

async function ensureTables(k: knex.Knex) {
  const hasCounts = await k.schema.hasTable('analytics_counts')
  if (hasCounts) return

  await k.schema.createTable('analytics_counts', (t) => {
    t.string('event').primary()
    t.bigint('count').notNullable().defaultTo(0)
  })

  await k.schema.createTable('analytics_totals', (t) => {
    t.string('metric').primary()
    t.bigint('value').notNullable().defaultTo(0)
  })

  await k.schema.createTable('analytics_daily', (t) => {
    t.date('date').notNullable()
    t.string('event').notNullable()
    t.bigint('count').notNullable().defaultTo(0)
    t.primary(['date', 'event'])
  })

  await k.schema.createTable('feedback', (t) => {
    t.increments('id')
    t.string('name').nullable()
    t.string('email')
    t.text('message')
    t.timestamp('created_at').defaultTo(k.fn.now())
  })
}

export async function getDb(): Promise<knex.Knex> {
  if (db) return db

  if (!ready) {
    ready = (async () => {
      db = knex({
        client: 'pg',
        connection: process.env.DATABASE_URL,
        pool: { min: 2, max: 10 },
      })

      await ensureTables(db)
    })()
  }

  await ready
  return db!
}
