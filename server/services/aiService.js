const openaiProvider = require('./providers/openaiProvider');
const mockProvider = require('./providers/mockProvider');
const geminiProvider = require('./providers/geminiProvider');

const VALID_CLASSIFICATIONS = ['general_question', 'technical_issue', 'billing', 'urgent'];
const CONFIDENCE_THRESHOLD = Number(process.env.CONFIDENCE_THRESHOLD || 0.7);

function pickProvider() {
  const hasKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key';
  const hasGeminiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key';
  if (process.env.AI_PROVIDER === 'mock' || !hasKey) {
    return { provider: mockProvider, name: hasKey ? 'mock (forced)' : 'mock (no OPENAI_API_KEY set)' };
  }
  if (process.env.AI_PROVIDER === 'gemini' && hasGeminiKey) {
    return { provider: geminiProvider, name: 'gemini' };
  }
  return { provider: openaiProvider, name: 'openai' };
}

/**
 * Validates the raw AI output. Never trusts it blindly.
 * Returns { valid: true, data } or { valid: false, reason }.
 */
function validateAiOutput(raw) {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, reason: 'AI response was not a valid JSON object.' };
  }

  const { classification, confidence, should_escalate, reason, reply } = raw;

  if (!VALID_CLASSIFICATIONS.includes(classification)) {
    return { valid: false, reason: `AI returned an invalid classification: ${classification}` };
  }

  if (typeof confidence !== 'number' || Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
    return { valid: false, reason: `AI returned an invalid confidence value: ${confidence}` };
  }

  if (typeof should_escalate !== 'boolean') {
    return { valid: false, reason: 'AI response missing/invalid should_escalate field.' };
  }

  if (typeof reply !== 'string' || reply.trim().length === 0) {
    return { valid: false, reason: 'AI response missing a customer-facing reply.' };
  }

  if (reason !== null && typeof reason !== 'string') {
    return { valid: false, reason: 'AI response has an invalid reason field.' };
  }

  return {
    valid: true,
    data: { classification, confidence, should_escalate, reason: reason ?? null, reply },
  };
}

/**
 * Classifies + generates a reply for a customer message.
 * Always returns a safe, well-formed result - on ANY failure (network,
 * invalid JSON, invalid fields, low confidence) it returns a safe
 * escalation result instead of throwing up the stack.
 */
async function classifyAndRespond({ message, history = [] }) {
  const { provider, name } = pickProvider();

  let raw;
  try {
    raw = await provider.classify({ message, history });
  } catch (err) {
    // A. LLM/API failure, or invalid JSON thrown by JSON.parse in the provider
    return {
      classification: null,
      confidence: 0,
      should_escalate: true,
      reason: `AI service failure: ${err.message}`,
      reply:
        "I've escalated this conversation to our support team because I ran into a technical problem processing your message.",
      providerUsed: name,
      aiFailure: true,
    };
  }

  const validation = validateAiOutput(raw);
  if (!validation.valid) {
    // B/C. invalid JSON shape / invalid classification / missing fields
    return {
      classification: null,
      confidence: 0,
      should_escalate: true,
      reason: `Invalid AI output: ${validation.reason}`,
      reply:
        "I've escalated this conversation to our support team because I couldn't safely process a response to your message.",
      providerUsed: name,
      aiFailure: true,
    };
  }

  const data = validation.data;

  // Enforce confidence threshold server-side too - never trust the model's
  // own should_escalate flag alone.
  const shouldEscalate = data.should_escalate || data.confidence < CONFIDENCE_THRESHOLD;

  let reason = data.reason;
  if (shouldEscalate && !reason) {
    reason =
      data.confidence < CONFIDENCE_THRESHOLD
        ? 'AI confidence was below the required threshold.'
        : 'AI determined this conversation requires human review.';
  }

  return {
    classification: data.classification,
    confidence: data.confidence,
    should_escalate: shouldEscalate,
    reason: shouldEscalate ? reason : null,
    reply: data.reply,
    providerUsed: name,
    aiFailure: false,
  };
}

module.exports = { classifyAndRespond, validateAiOutput, CONFIDENCE_THRESHOLD, VALID_CLASSIFICATIONS };
