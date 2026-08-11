function validateNewConversation(req, res, next) {
  const { name, email } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'A valid "name" is required.' });
  }
  if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'A valid "email" is required.' });
  }
  next();
}

function validateNewMessage(req, res, next) {
  const { content } = req.body || {};

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Message "content" must be a non-empty string.' });
  }
  if (content.length > 4000) {
    return res.status(400).json({ error: 'Message is too long (max 4000 characters).' });
  }
  next();
}

module.exports = { validateNewConversation, validateNewMessage };
