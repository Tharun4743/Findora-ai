require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Generate AI Content using Google Gemini API
 */
async function generateContent(promptText, options = {}) {
  if (!GEMINI_API_KEY) {
    console.warn('[GEMINI WARNING] GEMINI_API_KEY is not configured in .env');
    return null;
  }

  const model = options.model || GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText
              }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxTokens ?? 800
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[GEMINI API ERROR ${response.status}]`, errText);
      return null;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate ? candidate.trim() : null;
  } catch (error) {
    console.warn('[GEMINI FETCH ERROR]', error.message);
    return null;
  }
}

/**
 * Parse plain natural language search into structured parameters
 */
async function parseSearchWithGemini(naturalQuery) {
  const prompt = `You are the NLP engine of FINDORA AI Lost & Found.
Extract structured search filters from this query: "${naturalQuery}".
Return ONLY a valid JSON object without markdown or formatting, with the following keys:
{
  "category": "Electronics | Bags | Keys | Accessories | Clothing | Cards | Books | Other",
  "color": "extracted primary color or null",
  "brand": "extracted brand or null",
  "location": "extracted location or campus building or null",
  "keywords": ["array", "of", "search", "terms"]
}`;

  try {
    const raw = await generateContent(prompt);
    if (!raw) return null;
    const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.warn('[GEMINI NLP PARSE FAILED]', err.message);
    return null;
  }
}

module.exports = {
  generateContent,
  parseSearchWithGemini
};
