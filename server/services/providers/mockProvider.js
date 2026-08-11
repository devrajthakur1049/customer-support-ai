/**
 * Deterministic keyword-based mock provider.
 *
 * Used automatically when no OPENAI_API_KEY is configured, so the app
 * (and its tests) can run fully offline. It mimics the same JSON contract
 * the OpenAI provider returns, so aiService.js's validation logic is
 * exercised identically regardless of provider.
 */

const RULES = [
  {
    test: /(hack|hacked|compromis|unauthorized|breach|fraud)/i,
    classification: 'urgent',
    confidence: 0.95,
    should_escalate: true,
    reason: 'Potential account security incident requires immediate human review.',
    reply:
      "I've escalated this conversation to our support team right away because this looks like a possible security issue with your account.",
  },
  {
    test: /(refund|charged twice|double charge|duplicate charge)/i,
    classification: 'billing',
    confidence: 0.9,
    should_escalate: true,
    reason: 'Refund/duplicate charge requests require human review.',
    reply:
      "I've escalated this conversation to our support team because refund and duplicate-charge requests require human review.",
  },
  {
    test: /(delete my account|close my account|account deletion)/i,
    classification: 'general_question',
    confidence: 0.9,
    should_escalate: true,
    reason: 'Account deletion requires human verification.',
    reply:
      "I've escalated this conversation to our support team because account deletion requires human verification.",
  },
  {
    test: /(can'?t log ?in|cannot log ?in|login|log in|password|reset)/i,
    classification: 'technical_issue',
    confidence: 0.88,
    should_escalate: false,
    reason: null,
    reply:
      'You can reset your password from the forgot-password flow. Reset emails may take a few minutes to arrive, so please also check your spam/junk folder.',
  },
  {
    test: /(browser|cache|won'?t load|not loading|crash|bug|error)/i,
    classification: 'technical_issue',
    confidence: 0.8,
    should_escalate: false,
    reason: null,
    reply:
      'For common browser issues, please try clearing your cache or using a different browser. Let me know if that resolves it.',
  },
  {
    test: /(plan|pricing|price|feature|what do you offer|hours|contact)/i,
    classification: 'general_question',
    confidence: 0.82,
    should_escalate: false,
    reason: null,
    reply:
      "Thanks for reaching out! I don't have that specific detail in my knowledge base, but I can pass this along, or let me know if you had a different question I can help with directly.",
  },
];

async function classify({ message }) {
  for (const rule of RULES) {
    if (rule.test.test(message)) {
      return {
        classification: rule.classification,
        confidence: rule.confidence,
        should_escalate: rule.should_escalate,
        reason: rule.reason,
        reply: rule.reply,
      };
    }
  }

  // Nothing in the knowledge base matches -> low confidence -> escalate.
  return {
    classification: 'general_question',
    confidence: 0.4,
    should_escalate: true,
    reason: 'The knowledge base does not contain enough information to answer this question.',
    reply:
      "I've escalated this conversation to our support team because I don't have enough information to answer that confidently.",
  };
}

module.exports = { classify };
