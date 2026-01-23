import { Elysia } from 'elysia'
import { db } from '../db'

export const analyticsRoutes = new Elysia()
  .get('/status/:url', async ({ params }) => {
    const decodedUrl = decodeURIComponent(params.url)

    const { data, error } = await db
      .from('analytics')
      .select('*')
      .eq('website_url', decodedUrl)
      .order('checked_at', { ascending: false })
      .limit(1)

    if (error) throw error

    return data?.[0] ?? { status: 0, ping5: null }
  })

  .get('/analytics/:url', async ({ params }) => {
    const decodedUrl = decodeURIComponent(params.url)

    console.log(`Fetching raw history for: ${decodedUrl}`)

    const { data, error } = await db
      .from('analytics')
      .select('*')
      .eq('website_url', decodedUrl)
      .order('checked_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data
  })
  .get('/public/status', async () => {
    const { data, error } = await db
      .from('ownership')
      .select('*')
      .eq('is_public', true)

    if (error) throw error
    return data
  })
