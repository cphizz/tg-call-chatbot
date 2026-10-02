// Netlify Function: proxies Anthropic Claude requests so reps never need an API key.
// Key stored as ANTHROPIC_API_KEY env var in Netlify Site Settings > Environment variables.
//
// Gate: origin must match the deployed app host OR local dev. The passcode gate on the
// client side means only passcode-verified reps hit this. Server also does a sanity check.
//
// Simple abuse protection:
// - Enforces max_tokens cap
// - Validates model allowlist
// - Rejects messages array over a reasonable size
// - Logs rough usage counts (visible in Netlify Functions logs)

const ALLOWED_MODELS = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-5',
  'claude-opus-5',
])

const ALLOWED_ORIGINS = [
  'https://tg-call-chatbot.netlify.app',  // primary
  'https://callassistchatbot.netlify.app',  // legacy from first rename
  'https://sparkly-kataifi-9ae8ea.netlify.app',  // legacy from original
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
]

const MAX_TOKENS_CAP = 2000
const MAX_MESSAGES = 20
const MAX_SYSTEM_CHARS = 60000
const MAX_MESSAGE_CHARS = 10000

exports.handler = async (event, context) => {
  // CORS preflight
  const origin = event.headers.origin || event.headers.Origin || ''
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Origin gate (same site only)
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Origin not allowed' }) }
  }

  // API key must be configured
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500, headers: corsHeaders,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY env var is not configured on Netlify. Site Settings → Environment variables → add ANTHROPIC_API_KEY.' })
    }
  }

  // Parse body
  let body
  try { body = JSON.parse(event.body || '{}') }
  catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { system, messages, max_tokens, model } = body

  // Validate inputs
  if (!system || typeof system !== 'string' || system.length > MAX_SYSTEM_CHARS) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid or oversized system prompt' }) }
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Messages must be a non-empty array under ' + MAX_MESSAGES }) }
  }
  for (const m of messages) {
    if (!m || typeof m.role !== 'string' || typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_CHARS) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Each message must have role (string) + content (string under ' + MAX_MESSAGE_CHARS + ' chars)' }) }
    }
  }

  const chosenModel = ALLOWED_MODELS.has(model) ? model : 'claude-haiku-4-5-20251001'
  const tokens = Math.min(Number(max_tokens) || 600, MAX_TOKENS_CAP)

  // Call Anthropic
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: chosenModel,
        max_tokens: tokens,
        system,
        messages,
      })
    })

    const data = await r.json().catch(() => null)
    if (!r.ok) {
      return {
        statusCode: r.status, headers: corsHeaders,
        body: JSON.stringify({ error: `Anthropic error ${r.status}`, details: data || null })
      }
    }

    // Rough usage log (shows up in Netlify Functions logs)
    const inTokens = data?.usage?.input_tokens || 0
    const outTokens = data?.usage?.output_tokens || 0
    console.log(`claude: model=${chosenModel} in=${inTokens} out=${outTokens} msgs=${messages.length}`)

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) }
  } catch (err) {
    console.error('Proxy error:', err)
    return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Proxy failed: ' + err.message }) }
  }
}
