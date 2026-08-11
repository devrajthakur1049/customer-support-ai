/**
 * Small demo knowledge base.
 *
 * The AI is instructed (see aiService.js) to answer customer questions
 * using ONLY these facts. If the answer isn't in here, the model is told
 * to set should_escalate = true rather than invent a policy.
 */

const KNOWLEDGE_BASE = `
LOGIN:
- Users can reset passwords from the forgot-password flow.
- Password reset emails may take a few minutes to arrive.
- Users should check their spam/junk folder if the email doesn't arrive.

BILLING:
- Refund requests always require human review and must be escalated.
- Duplicate charges must be escalated to billing support.

ACCOUNT:
- Account deletion requires human verification and must be escalated.

TECHNICAL:
- For common browser issues, users can try clearing their cache or using another browser.
`.trim();

module.exports = { KNOWLEDGE_BASE };
