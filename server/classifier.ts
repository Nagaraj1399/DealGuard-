import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import type { MessageClassification } from './types.ts';

const SYSTEM_PROMPT = `You are Guardian Copilot, a real-time real-estate chat safety and deal-intent classifier for DealGuard.
Analyze the latest message (with recent thread context) and return STRICT JSON only:
{"trust_flag":boolean,"trust_reason":string|null,"lead_score":number,"risk_of_loss":number}

Rules:
1. trust_flag (Trust Shield — P2P real-estate scam detection):
CRITICAL SCOPE RULE: Evaluate "trust_flag" STRICTLY on the "Latest" message alone. NEVER set "trust_flag": true on a clean, benign, or walkaway "Latest" message because of earlier scam messages in "Context". Use "Context" only to understand conversational momentum for lead_score and risk_of_loss.
Set true with a specific trust_reason (<110 chars) ONLY if the "Latest" message itself does any of:
- Requests advance payment, booking/holding/key/application deposit before an in-person viewing or outside verified escrow, via ANY method (UPI, Zelle, Venmo, CashApp, PayPal, bank wire, Western Union, crypto/BTC/USDT, gift cards, cash upfront).
- Claims to be out of town/overseas and offers to mail/courier/drop keys after upfront payment.
- Pressures skipping the in-person tour, uses artificial payment urgency, or coerces moving off-platform (WhatsApp/Telegram/Signal, "delete this chat", bypass brokers/escrow).
- Asks for sensitive financial/ID credentials in chat.
Set false and null whenever the "Latest" message itself is legitimate real-estate talk, a benign question, or a buyer walking away.

2. risk_of_loss (0-100 — Walkaway / Disengagement Radar):
Score 85-98 when the buyer's "Latest" message signals disengaging, walking away, losing patience, choosing another property, cancelling a visit, or passing on the deal in ANY phrasing ("nvm I'll look elsewhere", "forget it, I'm out", "count me out", "going with another unit", "done waiting", "not worth the hassle", "too steep, pass").
Score 5-35 for normal engaged questions or scheduling. Score 40-70 for mild hesitation that keeps negotiating.

3. lead_score (0-100 — Buyer Closing Readiness):
Score 85-98 for immediate commitment (ready to sign, submitting formal/cash offer now, requesting contract/escrow docs to lock unit).
Score 50-75 for active engaged inquiries. Score 10-40 for walkaway or scam messages.

Few-shot examples (generalize semantically beyond these):
- "I'm traveling in London, Zelle me $600 and I'll FedEx the keys." -> {"trust_flag":true,"trust_reason":"Upfront Zelle payment requested to mail keys without an in-person viewing.","lead_score":15,"risk_of_loss":20}
- "Send 0.05 BTC today and delete this chat so we finish on Telegram." -> {"trust_flag":true,"trust_reason":"Coercion to pay in crypto and move off-platform to bypass escrow.","lead_score":10,"risk_of_loss":15}
- "Pay a refundable $250 CashApp token before I share the gate code." -> {"trust_flag":true,"trust_reason":"Advance CashApp payment demanded before granting viewing access.","lead_score":20,"risk_of_loss":20}
- "This is too slow, we're going with the townhouse we toured yesterday." -> {"trust_flag":false,"trust_reason":null,"lead_score":18,"risk_of_loss":93}
- "Skip it, this won't work for us, we'll keep looking." -> {"trust_flag":false,"trust_reason":null,"lead_score":20,"risk_of_loss":91}
- "Financing is cleared — send the purchase agreement for our full-price offer today." -> {"trust_flag":false,"trust_reason":null,"lead_score":94,"risk_of_loss":8}
- "Does the HOA cover water and how long is standard escrow after Saturday's tour?" -> {"trust_flag":false,"trust_reason":null,"lead_score":72,"risk_of_loss":12}

Output ONLY the raw JSON object.`;

const DEFAULT_UNCLASSIFIED: MessageClassification = {
  trust_flag: false,
  trust_reason: null,
  lead_score: 50,
  risk_of_loss: 20,
};

let geminiClient: GoogleGenAI | null = null;
let geminiClientKey: string | null = null;

function getGeminiClient(apiKey: string): GoogleGenAI {
  if (!geminiClient || geminiClientKey !== apiKey) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    geminiClientKey = apiKey;
  }
  return geminiClient;
}

function formatConversationPrompt(
  currentMessage: string,
  history: Array<{ senderName: string; senderRole: string; content: string }>,
  senderRole?: string
): string {
  const recentTurns = history
    .slice(-4)
    .map((m) => `${m.senderRole.toUpperCase()} (${m.senderName}): ${m.content}`)
    .join('\n');

  const roleTag = senderRole ? senderRole.toUpperCase() : 'PARTICIPANT';
  return `Context:\n${recentTurns || '(Start of thread)'}\n\nLatest (${roleTag}):\n"${currentMessage}"`;
}

async function callGroqModel(
  groqApiKey: string,
  model: string,
  userPrompt: string
): Promise<MessageClassification> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 140,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Groq(${model}) HTTP ${res.status}: ${errText.slice(0, 180)}`);
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error(`Groq(${model}) returned empty content`);
    }
    return validateClassification(parseJsonObject(raw));
  } catch (err) {
    clearTimeout(timeoutId);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

async function classifyWithGroq(
  groqApiKey: string,
  currentMessage: string,
  history: Array<{ senderName: string; senderRole: string; content: string }>,
  senderRole?: string
): Promise<MessageClassification> {
  const userPrompt = formatConversationPrompt(currentMessage, history, senderRole);
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      return await callGroqModel(groqApiKey, model, userPrompt);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Groq model fallback (${model}):`, lastError.message);
    }
  }

  throw lastError || new Error('All Groq models failed');
}

async function classifyWithGemini(
  geminiApiKey: string,
  currentMessage: string,
  history: Array<{ senderName: string; senderRole: string; content: string }>,
  senderRole?: string
): Promise<MessageClassification> {
  const ai = getGeminiClient(geminiApiKey);
  const userPrompt = formatConversationPrompt(currentMessage, history, senderRole);

  const schema = {
    type: Type.OBJECT,
    properties: {
      trust_flag: {
        type: Type.BOOLEAN,
        description: 'True if message exhibits P2P real-estate scam or off-platform payment coercion.',
      },
      trust_reason: {
        type: Type.STRING,
        description: 'Short explanation when trust_flag is true; empty string otherwise.',
      },
      lead_score: {
        type: Type.NUMBER,
        description: 'Buyer closing readiness score from 0 to 100.',
      },
      risk_of_loss: {
        type: Type.NUMBER,
        description: 'Buyer disengagement or walkaway risk score from 0 to 100.',
      },
    },
    required: ['trust_flag', 'lead_score', 'risk_of_loss'],
  };

  const candidates: Array<{ model: string; useThinking: boolean }> = [
    { model: 'gemini-2.5-flash', useThinking: false },
    { model: 'gemini-3.1-flash-lite', useThinking: false },
    { model: 'gemini-4-hydrogen', useThinking: true },
  ];

  let lastError: Error | null = null;
  for (const { model, useThinking } of candidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            abortSignal: controller.signal,
            ...(useThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini(${model}) timed out after 8000ms`)), 8000)
        ),
      ]);
      clearTimeout(timeoutId);

      if (!response.text) {
        throw new Error(`Gemini(${model}) returned empty text`);
      }

      return validateClassification(parseJsonObject(response.text));
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Gemini model fallback (${model}):`, lastError.message);
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

export async function classifyMessage(
  currentMessage: string,
  history: Array<{ senderName: string; senderRole: string; content: string }> = [],
  senderRole?: string
): Promise<MessageClassification> {
  const trimmed = currentMessage.trim();
  if (!trimmed) {
    return { ...DEFAULT_UNCLASSIFIED };
  }

  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

  // Primary real LLM classifier: Groq (Llama 3.3 70B with Llama 3.1 8B instant failover)
  if (groqApiKey && groqApiKey !== 'MY_GROQ_API_KEY') {
    try {
      return await classifyWithGroq(groqApiKey, trimmed, history, senderRole);
    } catch (err) {
      console.warn('Groq classifier failed, failing over to Gemini:', err instanceof Error ? err.message : err);
    }
  }

  // Secondary real LLM classifier: Gemini (@google/genai)
  if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
    try {
      return await classifyWithGemini(geminiApiKey, trimmed, history, senderRole);
    } catch (err) {
      console.warn('Gemini classifier failed:', err instanceof Error ? err.message : err);
    }
  }

  // Graceful degradation only if all upstream LLM providers are unreachable/unconfigured
  console.warn('No upstream LLM provider succeeded; returning unclassified neutral fallback.');
  return { ...DEFAULT_UNCLASSIFIED };
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

function clampScore(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.round(Math.max(0, Math.min(100, num)));
}

function validateClassification(obj: Record<string, unknown>): MessageClassification {
  const trustFlag = Boolean(obj?.trust_flag);
  const rawReason = typeof obj?.trust_reason === 'string' ? obj.trust_reason.trim() : '';
  const trustReason =
    trustFlag
      ? (rawReason && rawReason.toLowerCase() !== 'null'
          ? rawReason
          : 'Suspicious payment or off-platform coercion pattern detected')
      : null;

  return {
    trust_flag: trustFlag,
    trust_reason: trustReason,
    lead_score: clampScore(obj?.lead_score, 50),
    risk_of_loss: clampScore(obj?.risk_of_loss, 20),
  };
}
