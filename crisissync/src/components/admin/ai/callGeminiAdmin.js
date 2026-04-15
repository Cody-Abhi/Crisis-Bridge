// callGeminiAdmin.js — Production-grade Gemini API caller for Admin AI Assistant
//
// Handles: rate limits, timeouts, blocked content, network errors, and
// conversation-memory via multi-turn message history.

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const REQUEST_TIMEOUT_MS = 15_000  // 15 seconds — generous for free tier

/**
 * Build the full system prompt that gives Gemini awareness of THIS hotel,
 * right now. Injected as the first "user" turn so the model treats it as
 * grounding context rather than a conversational message.
 */
const buildSystemPrompt = (context) => `
You are the AI operations assistant embedded in CrisisSync — a real-time hotel
emergency management system used during natural disasters and crisis situations.

You are speaking to the hotel admin. Your job is to:
1. Help them manage active emergencies (SOS signals) — who to assign, what to prioritize
2. Report on staff availability — who is on duty, who is free
3. Summarize incident history and response performance
4. Recommend whether to approve pending staff requests
5. Stay calm, concise, and actionable — max 120 words per reply

Rules you MUST follow:
- Always reference specific room numbers, staff names, and times when available
- Never say "I don't have access" or "I don't know" — use the context below
- If emergencies are active, mention them proactively even if not asked
- Plain text only — no markdown, no asterisks, no bullet symbols, no emojis
- If the admin asks about something unrelated to hotel operations, politely redirect
- When multiple emergencies exist, prioritize by threat to life (Fire > Medical > Security > General)

=== LIVE HOTEL CONTEXT (refreshed before every message) ===
${context}
=== END CONTEXT ===
`.trim()

/**
 * Calls the Gemini 1.5 Flash API with full conversation context.
 *
 * @param {string}  userMessage          The admin's current message
 * @param {string}  context              Live hotel context string from buildAdminContext()
 * @param {Array}   conversationHistory  Array of { sender: 'admin'|'ai', text: string }
 * @returns {Promise<string>}            The AI reply text
 * @throws {Error}  With message 'RATE_LIMIT' or 'NETWORK_ERROR'
 */
export const callGeminiAdmin = async (userMessage, context, conversationHistory = []) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_key') {
    throw new Error('NETWORK_ERROR')  // Treat missing key as network error
  }

  const systemPrompt = buildSystemPrompt(context)

  // Build multi-turn conversation: system → ack → history (last 10) → current
  const recentHistory = conversationHistory.slice(-10)
  const contents = [
    { role: 'user',  parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I am actively monitoring your hotel and ready to assist with any situation.' }] },
    ...recentHistory.map(m => ({
      role:  m.sender === 'admin' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ]

  // Abort controller for request timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  controller.signal,
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature:     0.4,    // Low = factual, grounded in context
          maxOutputTokens: 250,    // ~120 words ceiling
          topP:            0.85,
          topK:            40,
        },
        // Safety: let through crisis-related content (fire, medical, etc.)
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',         threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',        threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',  threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT',  threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    })

    clearTimeout(timeoutId)

    // ── Handle HTTP-level errors ──────────────────────────────────────────
    if (response.status === 429) {
      throw new Error('RATE_LIMIT')
    }

    if (!response.ok) {
      console.error(`[AdminAI] Gemini API error: HTTP ${response.status}`)
      throw new Error('NETWORK_ERROR')
    }

    // ── Parse response ──────────────────────────────────────────────────
    const data = await response.json()

    // Check for blocked content (safety filters)
    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
      return 'I cannot respond to that query. Please ask me about hotel operations, staff, or emergencies.'
    }

    // Check for empty/missing candidates
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.warn('[AdminAI] Empty response from Gemini:', JSON.stringify(data).slice(0, 300))
      return 'I could not generate a response right now. Please try rephrasing your question.'
    }

    return text.trim()

  } catch (err) {
    clearTimeout(timeoutId)

    // Re-throw typed errors
    if (err.message === 'RATE_LIMIT') throw err

    // AbortController timeout
    if (err.name === 'AbortError') {
      console.error('[AdminAI] Request timed out after', REQUEST_TIMEOUT_MS, 'ms')
      throw new Error('NETWORK_ERROR')
    }

    // Any other fetch/network error
    console.error('[AdminAI] Gemini call failed:', err.message)
    throw new Error('NETWORK_ERROR')
  }
}
