const express = require('express');
const {
  createConversation,
  getConversation,
  listMessages,
  postMessage,
} = require('../controllers/conversationsController');
const { validateNewConversation, validateNewMessage } = require('../middleware/validate');

const router = express.Router();

router.post('/', validateNewConversation, createConversation);
router.get('/:conversationId', getConversation);
router.get('/:conversationId/messages', listMessages);
router.post('/:conversationId/messages', validateNewMessage, postMessage);

module.exports = router;
