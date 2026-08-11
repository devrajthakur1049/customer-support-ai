import { useState } from 'react';
import StartScreen from './components/StartScreen.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import { startConversation } from './api.js';

export default function App() {
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart({ name, email }) {
    setLoading(true);
    setError('');
    try {
      const data = await startConversation({ name, email });
      setConversation(data.conversation);
    } catch (err) {
      setError(err.message || 'Could not start conversation.');
    } finally {
      setLoading(false);
    }
  }

  if (!conversation) {
    return (
      <>
        <StartScreen onStart={handleStart} loading={loading} />
        {error && (
          <p className="text-center text-sm text-red-600 -mt-40">{error}</p>
        )}
      </>
    );
  }

  return (
    <ChatWindow
      conversation={conversation}
      initialMessages={[]}
      onConversationUpdate={setConversation}
    />
  );
}
