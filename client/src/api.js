const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export async function startConversation({ name, email }) {
  const res = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email }),
  });
  return handle(res);
}

export async function sendMessage({ conversationId, content }) {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return handle(res);
}

export async function fetchMessages(conversationId) {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
  return handle(res);
}

export async function fetchConversation(conversationId) {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}`);
  return handle(res);
}
