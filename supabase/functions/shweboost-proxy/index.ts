const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SHWEBOOST_API = 'https://shweboost.com/api/v2'
const API_KEY = Deno.env.get('SHWEBOOST_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, ...params } = await req.json()

    if (action === 'sync-services') {
      // Fetch all services from Shweboost
      const formData = new URLSearchParams()
      formData.append('key', API_KEY)
      formData.append('action', 'services')

      const res = await fetch(SHWEBOOST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      })
      const services = await res.json()

      if (!Array.isArray(services)) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid API response' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        })
      }

      // Upsert into Supabase with 20% markup
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      
      const rows = services.map((s: any) => ({
        service_id: parseInt(s.service),
        name: s.name || '',
        category: s.category || 'Other',
        type: s.type || null,
        rate: parseFloat(s.rate) || 0,
        selling_rate: Math.ceil((parseFloat(s.rate) || 0) * 1.20),
        min: parseInt(s.min) || 1,
        max: parseInt(s.max) || 1,
        description: s.desc || s.description || null,
        is_active: true,
      }))

      // Batch upsert in chunks of 500
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500)
        const { error } = await supabase
          .from('services')
          .upsert(chunk, { onConflict: 'service_id' })
        if (error) {
          console.error('Upsert error:', error)
        }
      }

      return new Response(JSON.stringify({ success: true, count: rows.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'add') {
      // Place order
      const { service, link, quantity } = params
      const formData = new URLSearchParams()
      formData.append('key', API_KEY)
      formData.append('action', 'add')
      formData.append('service', String(service))
      formData.append('link', link || '')
      formData.append('quantity', String(quantity))

      const res = await fetch(SHWEBOOST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      })
      const result = await res.json()

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'status') {
      const { order } = params
      const formData = new URLSearchParams()
      formData.append('key', API_KEY)
      formData.append('action', 'status')
      formData.append('order', String(order))

      const res = await fetch(SHWEBOOST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      })
      const result = await res.json()

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: false, message: 'Invalid action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
