const { KNOWLEDGE_BASE } = require('../../knowledgebase/knowledgeBase');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function buildSystemPrompt() {
  return `You are a customer support classification and response assistant.

You must classify every customer message into exactly one of:
- general_question
- technical_issue
- billing
- urgent

You may ONLY use the following knowledge base to answer the customer.
Do not invent company policy that is not in this knowledge base.

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}

Rules:
- If the knowledge base does not contain enough information to answer, set should_escalate to true.
- Refund requests, duplicate charges, and account deletion always require human review -> should_escalate = true.
- Urgent/security issues (e.g. account compromise) -> classification = "urgent" and should_escalate = true.
- If you are not confident (confidence < 0.70), set should_escalate to true.
- "confidence" is your own estimated confidence (0 to 1) in the classification AND in the correctness/completeness of the answer.
- "reply" is the message shown to the customer. If should_escalate is true, the reply MUST clearly tell the
  customer the conversation has been escalated to the human support team, and briefly say why.
- If should_escalate is false, "reply" should directly answer the question using ONLY the knowledge base.

Respond with ONLY a JSON object, no markdown, no code fences, in exactly this shape:
{
  "classification": "general_question" | "technical_issue" | "billing" | "urgent",
  "confidence": 0.0-1.0,
  "should_escalate": true | false,
  "reason": string | null,
  "reply": string
}`;
}

/**
 * Calls OpenAI's chat completions API and returns the raw parsed JSON
 * (unvalidated - validation happens in aiService.js).
 */
async function classify({ message, history = [] }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const historyMessages = history.slice(-6).map((m) => ({
    role: m.role === 'customer' ? 'user' : 'assistant',
    content: m.content,
  }));

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        ...historyMessages,
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI API error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content;

  if (!rawText) {
    throw new Error('OpenAI API returned no content');
  }

  return JSON.parse(rawText); // may throw SyntaxError -> caught by caller as invalid JSON
}

module.exports = { classify };
