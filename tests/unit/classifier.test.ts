import { describe, it, expect, vi, afterEach } from 'vitest';
import { classifyMessage } from '../../server/classifier.ts';

describe('Unit — real LLM classifier contract & graceful degradation', () => {
  const originalGroqKey = process.env.GROQ_API_KEY;
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalGroqKey;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
  });

  it('has zero hardcoded keyword bypasses when no LLM credentials are configured', async () => {
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;

    // Even the previously scripted UPI phrase must not match any hardcoded branch
    const res = await classifyMessage(
      'Please transfer the booking amount to this UPI ID before I show you the flat'
    );
    expect(res).toEqual({
      trust_flag: false,
      trust_reason: null,
      lead_score: 50,
      risk_of_loss: 20,
    });
  });

  it('parses and clamps real Groq JSON output for unscripted scam phrasing', async () => {
    process.env.GROQ_API_KEY = 'test-unit-key';
    delete process.env.GEMINI_API_KEY;

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  trust_flag: true,
                  trust_reason: 'Requests upfront Zelle payment to mail keys without a viewing.',
                  lead_score: 12,
                  risk_of_loss: 22,
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const result = await classifyMessage(
      'Zelle me $500 right now and I will overnight the condo keys to you',
      [],
      'seller'
    );
    expect(result.trust_flag).toBe(true);
    expect(result.trust_reason).toContain('Zelle');
    expect(result.lead_score).toBe(12);
    expect(result.risk_of_loss).toBe(22);
  });

  it('parses walkaway risk and preserves 0 scores without coercing to defaults', async () => {
    process.env.GROQ_API_KEY = 'test-unit-key';
    delete process.env.GEMINI_API_KEY;

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  trust_flag: false,
                  trust_reason: null,
                  lead_score: 0,
                  risk_of_loss: 96,
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const result = await classifyMessage(
      'This is dragging on forever, we picked another unit instead.',
      [],
      'buyer'
    );
    expect(result.trust_flag).toBe(false);
    expect(result.trust_reason).toBeNull();
    expect(result.lead_score).toBe(0);
    expect(result.risk_of_loss).toBe(96);
  });

  it('degrades gracefully when upstream LLM errors out', async () => {
    process.env.GROQ_API_KEY = 'test-unit-key';
    delete process.env.GEMINI_API_KEY;

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network timeout'));

    const result = await classifyMessage('What is the monthly HOA fee?');
    expect(result.trust_flag).toBe(false);
    expect(result.trust_reason).toBeNull();
    expect(result.lead_score).toBe(50);
    expect(result.risk_of_loss).toBe(20);
  });
});
