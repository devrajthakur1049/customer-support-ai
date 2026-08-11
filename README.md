# Customer Support AI Assistant

This is a small customer support chat app I built where an AI reads customer messages, classifies them, and replies using a fixed knowledge base — and if it's not confident (or the topic is something like refunds/account deletion that a human should really handle), it escalates instead of guessing.

The main thing I cared about while building this: **never trust the AI blindly**. Everything it outputs gets validated before it's used, and if anything looks off, the safe default is always "escalate to a human" — not "hope for the best."

## How it works

Basic flow when a customer sends a message:

1. Save the customer's message right away — even if the AI call fails later, we don't lose what they typed.
2. Send the message (plus last 6 turns of history) to the AI provider along with the knowledge base.
3. Check the AI's JSON response — is it valid JSON? Is the classification one of the 4 allowed values? Is confidence between 0-1? Is there an actual reply? If any of this fails, treat it as "must escalate."
4. Save the AI's reply as a message.
5. If it needs to be escalated, update the conversation and ping the n8n webhook (once — there's a check so we don't spam duplicate notifications).

```
React (Vite) → Express API → aiService (OpenAI or mock)
                    ↓
              Supabase (Postgres)
                    ↓
          escalationService → n8n webhook → Slack
```

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Node/Express
- DB: Supabase
- AI: OpenAI (`gpt-4o-mini`), but there's also a mock provider that kicks in automatically if there's no API key — so the whole thing still runs without needing to pay for anything
- Automation: n8n for the Slack notification
- Tests: just Node's built-in `node --test`, didn't want to pull in a whole test framework for this

## Folder structure

```
customer-support-ai/
  client/            React frontend
  server/
    controllers/
    routes/
    services/
      providers/       openaiProvider.js, mockProvider.js
      aiService.js
      escalationService.js
    knowledgebase/
    tests/
  supabase/schema.sql
  n8n/escalation-workflow.json
  .env.example
```

## Setting it up

**Supabase**
1. New project on supabase.com
2. Run `supabase/schema.sql` in the SQL editor
3. Grab your Project URL + `service_role` key and put them in `server/.env`

The service-role key stays server-side only (`server/services/supabaseClient.js`) — never gets sent to the browser.

**Running locally**
```bash
# backend
cd server
npm install
cp ../.env.example .env   # fill in your real values
npm run dev                # localhost:3001

# frontend (new terminal)
cd client
npm install
echo "VITE_API_BASE_URL=http://localhost:3001/api" > .env
npm run dev                # localhost:5173
```

**n8n**
1. Run it locally with `npx n8n` or use n8n Cloud
2. Import `n8n/escalation-workflow.json`
3. Set `SLACK_WEBHOOK_URL` in your n8n env (or swap the HTTP node for any other endpoint — email, Discord, whatever)
4. Activate it, copy the production webhook URL into `N8N_ESCALATION_WEBHOOK_URL`

The n8n workflow itself is simple: webhook comes in → check if `conversation_id` exists → if yes, hit Slack + respond 200; if no, respond 400.

## Env vars

Check `.env.example` — basically Supabase creds, `AI_PROVIDER`/`OPENAI_API_KEY`/`OPENAI_MODEL`, `CONFIDENCE_THRESHOLD`, and `N8N_ESCALATION_WEBHOOK_URL`. `VITE_API_BASE_URL` is the only one that's safe on the frontend since it's not a secret.

## Why validation matters here

I didn't want a situation where the model says `"should_escalate": false` with fake high confidence and something sensitive slips through. So `aiService.js` re-checks the confidence threshold server-side (default 0.70, from `CONFIDENCE_THRESHOLD`) no matter what the model itself reports. Same logic for `classification` — has to be one of `general_question | technical_issue | billing | urgent`, anything else gets rejected.

Escalation happens if **any** of these are true:
- AI itself says `should_escalate: true`
- confidence is below the threshold
- it's classified `urgent`
- it touches refunds/duplicate charges/account deletion (hardcoded into the prompt/mock rules — these should basically always go to a human)
- the AI call fails outright
- the output fails validation

Basically: when in doubt, escalate. I'd rather have a few unnecessary escalations than let a broken AI response reach a customer.

## Error handling, briefly

- If the LLM call fails → message is already saved, conversation gets escalated with a generic reason, app doesn't crash
- Bad/invalid AI JSON → caught, escalated
- DB failure → 502, no stack traces or secrets leaked to the client
- Duplicate escalation → `notifyEscalationOnce` checks `escalation_notified` before sending, so Slack doesn't get spammed
- Empty customer message → rejected with 400 before it even touches the AI or DB

## Testing

```bash
cd server
npm install
AI_PROVIDER=mock npm test
```

This runs against the mock provider so you don't need any real API keys or a live Supabase project to see it work. Covers the main scenarios from the spec (valid response, invalid JSON, low confidence, urgent classification, refund/deletion keywords, API failure, etc.)

To poke at the actual HTTP layer:
```bash
npm run dev
curl -X POST http://localhost:3001/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com"}'
```
(This one needs a real Supabase project connected, or you'll get a 502.)

## Some notes / things I decided along the way

- Went with 0.70 as the confidence threshold — felt like a reasonable middle ground, not in the spec as a hard number so I picked something sane.
- No auth system. Conversations are just tied to an email, created on the fly. Cutting this was a conscious call to keep scope manageable — obviously not production-ready without it.
- `urgent` always escalates no matter what confidence the model reports — didn't want a model being "confident" about something urgent to skip the human.
- Message roles include `human_agent` and `system` even though the current UI only uses `customer`/`ai` — left them in the schema for whenever a proper agent dashboard gets built.
- No API key? App still runs, just falls back to the mock provider instead of refusing to start. Made local dev/testing way less annoying.
- The Slack node in n8n is just a placeholder — swap the URL for literally any webhook-accepting endpoint and it still works.

## What's not here / known gaps

- No auth — anyone with a conversation ID can read/post to it right now
- No dashboard for human agents to actually reply through the app (they just get notified)
- Mock provider is just keyword matching, not a real model — good enough for testing, not for judging real accuracy
- Knowledge base is a plain string, not RAG/embeddings — fine for a handful of facts, won't scale
- No rate limiting, no pagination on messages
- Didn't have outbound network access to test live Supabase/OpenAI/n8n end-to-end in this environment — tested through the mock provider, unit tests, and local HTTP calls instead

## If I had another week

- Build the actual agent dashboard so escalations can be replied to, not just flagged
- Real auth (customer accounts + agent roles)
- Better logging/observability — right now if something breaks in prod I'd be flying blind
- Some kind of labeled eval set to actually measure classification accuracy over time instead of just vibes
- Move the knowledge base to RAG once it needs to grow past a few paragraphs
- Rate limiting on the public endpoint
- More integration tests against a real test Supabase project + some E2E tests for the React side
- Streaming responses instead of the current request/response back-and-forth