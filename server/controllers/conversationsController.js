const supabase = require('../services/supabaseClient');
const { classifyAndRespond } = require('../services/aiService');
const { escalateConversation } = require('../services/escalationService');

/**
 * POST /api/conversations
 * Creates (or reuses) a user by email, then creates a new conversation.
 */
async function createConversation(req, res, next) {
  try {
    const { name, email } = req.body;

    let { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (findError) {
      const e = new Error(`Database error looking up user: ${findError.message}`);
      e.status = 502;
      throw e;
    }

    if (!user) {
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({ name, email })
        .select()
        .single();

      if (createUserError) {
        const e = new Error(`Database error creating user: ${createUserError.message}`);
        e.status = 502;
        throw e;
      }
      user = newUser;
    }

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, status: 'active' })
      .select()
      .single();

    if (convError) {
      const e = new Error(`Database error creating conversation: ${convError.message}`);
      e.status = 502;
      throw e;
    }

    res.status(201).json({ conversation, user });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/conversations/:conversationId
 */
async function getConversation(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (error) {
      const e = new Error(`Database error fetching conversation: ${error.message}`);
      e.status = 502;
      throw e;
    }
    if (!data) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    res.json({ conversation: data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/conversations/:conversationId/messages
 */
async function listMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      const e = new Error(`Database error fetching messages: ${error.message}`);
      e.status = 502;
      throw e;
    }

    res.json({ messages: data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/conversations/:conversationId/messages
 * Saves the customer message, runs AI classification, saves the AI reply,
 * and escalates the conversation when required.
 */
async function postMessage(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (convError) {
      const e = new Error(`Database error fetching conversation: ${convError.message}`);
      e.status = 502;
      throw e;
    }
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    // F. Reject empty/invalid messages (also enforced by validate middleware).
    // Always save the customer message first, even if the AI later fails,
    // so no customer input is ever lost.
    const { data: customerMessage, error: msgError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'customer', content })
      .select()
      .single();

    if (msgError) {
      const e = new Error(`Database error saving message: ${msgError.message}`);
      e.status = 502;
      throw e;
    }

    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const aiResult = await classifyAndRespond({ content, message: content, history: history || [] });

    const { data: aiMessage, error: aiMsgError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'ai', content: aiResult.reply })
      .select()
      .single();

    if (aiMsgError) {
      const e = new Error(`Database error saving AI reply: ${aiMsgError.message}`);
      e.status = 502;
      throw e;
    }

    let updatedConversation = conversation;

    if (aiResult.should_escalate) {
      updatedConversation = await escalateConversation({
        conversationId,
        classification: aiResult.classification,
        reason: aiResult.reason,
      });
    } else {
      const { data: activeConversation, error: updateError } = await supabase
        .from('conversations')
        .update({ classification: aiResult.classification })
        .eq('id', conversationId)
        .select()
        .single();

      if (!updateError) updatedConversation = activeConversation;
    }

    res.status(201).json({
      customerMessage,
      aiMessage,
      conversation: updatedConversation,
      classification: aiResult.classification,
      confidence: aiResult.confidence,
      escalated: aiResult.should_escalate,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createConversation, getConversation, listMessages, postMessage };
