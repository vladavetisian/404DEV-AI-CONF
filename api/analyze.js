async function fetchWebsiteText(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`);

    const html = await res.text();

    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);

    if (!cleaned || cleaned.length < 50) {
      throw new Error('Not enough readable content found on the page');
    }

    return cleaned;
  } catch (err) {
    throw new Error(`Fetch error: ${err.message}`);
  }
}

function safeJsonParse(text) {
  try {
    let cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('{');
    const endObj = cleaned.lastIndexOf('}');
    const startArr = cleaned.indexOf('[');
    const endArr = cleaned.lastIndexOf(']');

    if (start >= 0 && endObj > start) {
      cleaned = cleaned.slice(start, endObj + 1);
    } else if (startArr >= 0 && endArr > startArr) {
      cleaned = cleaned.slice(startArr, endArr + 1);
    }

    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, industry } = req.body;

    if (!url || !industry) {
      return res.status(400).json({ error: 'URL and industry required.' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'API key not configured.' });
    }

    let content;
    try {
      content = await fetchWebsiteText(url);
    } catch (err) {
      return res.status(400).json({
        error: `Could not analyze website: ${err.message}`,
      });
    }

    const prompt = `
You are the Tier-Based Agent Generation System inside 404DEV AI.

Your job is NOT to modify websites.

Your job is to analyze a website and generate an EXTERNAL AI AGENT system based on business value.

INPUT:
Industry: ${industry}
Website Content: ${content}

---

AUTO ASSIGN TIER:

- TIER 1: small/unclear website → analysis only
- TIER 2: normal business → single growth agent
- TIER 3: strong business → autonomous growth system

---

RULES:
- NEVER modify website
- ALWAYS external system only
- Focus on revenue impact
- Be specific, not generic
- No marketing fluff

---

OUTPUT FORMAT:

### If TIER 1:
{
  "tier": "TIER_1",
  "summary": "string",
  "problems": ["string"],
  "revenueLeaks": ["string"],
  "recommendations": ["string"]
}

### If TIER 2:
{
  "tier": "TIER_2",
  "agent": {
    "name": "string",
    "role": "string",
    "functions": ["string"],
    "businessImpact": "string",
    "interaction": "string"
  }
}

### If TIER 3:
{
  "tier": "TIER_3",
  "system": {
    "name": "string",
    "agents": ["string"],
    "capabilities": ["string"],
    "businessImpact": "string",
    "interaction": "string"
  }
}

RETURN ONLY VALID JSON. NO TEXT. NO MARKDOWN.
`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return res.status(500).json({
        error: `AI generation failed: ${groqRes.status} - ${errText.slice(0, 200)}`,
      });
    }

    const groqData = await groqRes.json();
    const responseText = groqData.choices?.[0]?.message?.content || '';

    if (!responseText) {
      return res.status(500).json({ error: 'Empty response from AI.' });
    }

    const parsed = safeJsonParse(responseText);

    if (!parsed) {
      return res.status(200).json({
        rawResponse: responseText,
        warning: 'Failed to parse structured output',
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({
      error: `Server error: ${err.message}`,
    });
  }
}
