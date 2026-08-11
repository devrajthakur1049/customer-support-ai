const { GoogleGenAI } = require('@google/genai');
const { KNOWLEDGE_BASE } = require('../../knowledgebase/knowledgeBase');

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
- "confidence" is your estimated confidence from 0 to 1 in both the classification and the correctness/completeness of the answer.
- "reply" is the message shown to the customer.
- If should_escalate is true, the reply MUST clearly tell the customer the conversation has been escalated to the human support team and briefly say why.
- If should_escalate is false, reply using ONLY the knowledge base.

Respond with ONLY a JSON object in exactly this shape:

{
  "classification": "general_question" | "technical_issue" | "billing" | "urgent",
  "confidence": 0.0,
  "should_escalate": true,
  "reason": "string or null",
  "reply": "string"
}`;
}

async function classify({ message, history = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your-gemini-api-key') {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const ai = new GoogleGenAI({
    apiKey,
  });

  const historyText = history
    .slice(-6)
    .map((m) => {
      const role = m.role === 'customer' ? 'Customer' : 'Support Assistant';
      return `${role}: ${m.content}`;
    })
    .join('\n');

  const prompt = `${buildSystemPrompt()}

CONVERSATION HISTORY:
${historyText || '(No previous messages)'}

CURRENT CUSTOMER MESSAGE:
${message}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const rawText = response?.text;

  if (!rawText) {
    throw new Error('Gemini API returned no content');
  }

  return JSON.parse(rawText);
}

module.exports = { classify };