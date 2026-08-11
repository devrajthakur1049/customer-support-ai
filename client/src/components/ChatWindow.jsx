import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble.jsx';
import EscalationBanner from './EscalationBanner.jsx';
import { sendMessage } from '../api.js';

export default function ChatWindow({ conversation, initialMessages, onConversationUpdate }) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const isEscalated = conversation.status === 'escalated';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setError('');
    setSending(true);
    setInput('');

    // optimistic customer message
    setMessages((prev) => [...prev, { id: `tmp-${Date.now()}`, role: 'customer', content }]);

    try {
      const data = await sendMessage({ conversationId: conversation.id, content });
      setMessages((prev) => [
        ...prev.filter((m) => !String(m.id).startsWith('tmp-')),
        data.customerMessage,
        data.aiMessage,
      ]);
      onConversationUpdate(data.conversation);
    } catch (err) {
      setError(err.message || 'Something went wrong sending your message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white">
      <header className="border-b px-4 py-3">
        <h1 className="text-base font-semibold text-gray-800">Support chat</h1>
        <p className="text-xs text-gray-500">Conversation status: {conversation.status}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEscalated && <EscalationBanner reason={conversation.escalation_reason} />}

        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-red-600 px-4">{error}</p>}

      <form onSubmit={handleSend} className="border-t p-3 flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
