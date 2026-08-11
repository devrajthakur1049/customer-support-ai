const supabase = require('./supabaseClient');

/**
 * Marks a conversation as escalated and stores classification/reason.
 * Idempotent-safe: uses the DB row as source of truth for whether a
 * notification has already been sent (escalation_notified).
 */
async function escalateConversation({ conversationId, classification, reason }) {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .update({
      status: 'escalated',
      classification,
      escalation_reason: reason,
      escalated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to escalate conversation: ${error.message}`);
  }

  await notifyEscalationOnce(conversation);
  return conversation;
}

/**
 * Sends the n8n escalation webhook exactly once per conversation.
 *
 * Duplicate-notification protection strategy:
 * 1. Re-read the row's escalation_notified flag right before sending.
 * 2. Only attempt the webhook if it is still false.
 * 3. After a successful webhook call, flip escalation_notified to true
 *    using a conditional update (`.eq('escalation_notified', false)`),
 *    which makes the flip itself race-safe: if two requests reach this
 *    point concurrently, only one update actually matches a row and
 *    succeeds.
 */
async function notifyEscalationOnce(conversation) {
  if (conversation.escalation_notified) {
    return { notified: false, reason: 'already_notified' };
  }

  const webhookUrl = process.env.N8N_ESCALATION_WEBHOOK_URL;
  if (!webhookUrl) {
    // eslint-disable-next-line no-console
    console.warn('[escalationService] N8N_ESCALATION_WEBHOOK_URL not set - skipping notification.');
    return { notified: false, reason: 'webhook_not_configured' };
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversation.id,
        user_id: conversation.user_id,
        classification: conversation.classification,
        escalation_reason: conversation.escalation_reason,
        escalated_at: conversation.escalated_at,
      }),
    });
  } catch (err) {
    // Do not throw - a notification failure should not crash the request.
    // eslint-disable-next-line no-console
    console.error('[escalationService] Failed to call n8n webhook:', err.message);
    return { notified: false, reason: 'webhook_call_failed' };
  }

  // Conditional update -> idempotent even under concurrent calls.
  const { error: flagError } = await supabase
    .from('conversations')
    .update({ escalation_notified: true })
    .eq('id', conversation.id)
    .eq('escalation_notified', false);

  if (flagError) {
    // eslint-disable-next-line no-console
    console.error('[escalationService] Failed to set escalation_notified flag:', flagError.message);
  }

  return { notified: true };
}

module.exports = { escalateConversation, notifyEscalationOnce };
