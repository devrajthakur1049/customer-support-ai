# Customer Support AI Assistant

An AI-powered customer support assistant built with **React, Node.js/Express, Supabase, and OpenAI**.

The application reads customer messages, classifies them, generates a response using a predefined knowledge base, and escalates conversations to a human when the AI is uncertain or when the request requires human intervention.

The core design principle is **safe AI behavior**: AI output is validated server-side, and when something is uncertain or invalid, the system defaults to **human escalation instead of guessing**.

---

## 🚀 Features

* Customer support chat interface
* AI-based message classification
* Four supported classifications:

  * `general_question`
  * `technical_issue`
  * `billing`
  * `urgent`
* AI-generated customer responses
* Confidence-score validation
* Automatic human escalation
* n8n webhook integration for escalation notifications
* Slack notification workflow
* OpenAI provider
* Mock AI provider for local testing without an API key
* Supabase/PostgreSQL persistence
* Server-side AI response validation
* Duplicate escalation prevention
* Error handling and safe fallback behavior
* Automated tests using Node.js built-in test runner

---

## 🏗️ How It Works

When a customer sends a message:

1. The customer message is saved immediately.
2. The message and recent conversation history are sent to the AI provider.
3. The AI classifies the request and generates a response.
4. The backend validates the AI response:

   * Valid JSON
   * Valid classification
   * Confidence between `0` and `1`
   * Valid response text
5. The AI response is saved.
6. If the conversation requires human intervention, it is marked for escalation.
7. The escalation service sends a notification to the configured n8n webhook.
8. n8n can forward the notification to Slack.

### Architecture

```text
React (Vite)
      │
      ▼
Express API
      │
      ▼
AI Service
 ┌────┴─────┐
 ▼          ▼
OpenAI     Mock
Provider   Provider
      │
      ▼
Supabase / PostgreSQL
      │
      ▼
Escalation Service
      │
      ▼
n8n Webhook
      │
      ▼
Slack
```

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS

### Backend

* Node.js
* Express.js

### Database

* Supabase
* PostgreSQL

### AI

* OpenAI
* `gpt-4o-mini`
* Mock provider for local development/testing

### Automation

* n8n
* Slack webhook

### Testing

* Node.js built-in `node:test`

---

## 📁 Project Structure

```text
customer-support-ai/
│
├── client/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   │   ├── providers/
│   │   │   ├── openaiProvider.js
│   │   │   ├── mockProvider.js
│   │   │   └── geminiProvider.js
│   │   ├── aiService.js
│   │   └── escalationService.js
│   ├── knowledgebase/
│   ├── tests/
│   └── server.js
│
├── supabase/
│   └── schema.sql
│
├── n8n/
│   └── escalation-workflow.json
│
├── .env.example
├── .gitignore
└── README.md
```

---

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/devrajthakur1049/customer-support-ai.git
cd customer-support-ai
```

---

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file using the provided example:

```bash
cp ../.env.example .env
```

Then configure the required environment variables.

Start the backend:

```bash
npm run dev
```

Backend:

```text
http://localhost:3001
```

---

### 3. Frontend Setup

Open a second terminal:

```bash
cd client
npm install
```

Create the frontend environment file:

```bash
echo "VITE_API_BASE_URL=http://localhost:3001/api" > .env
```

Start the frontend:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 🗄️ Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run:

```text
supabase/schema.sql
```

4. Add the Supabase project URL and server-side credentials to `server/.env`.

The Supabase service-role key must remain **server-side only** and must never be exposed to the frontend.

---

## 🔐 Environment Variables

Use `.env.example` as the reference.

Typical backend variables include:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

AI_PROVIDER=
OPENAI_API_KEY=
OPENAI_MODEL=

GEMINI_API_KEY=

CONFIDENCE_THRESHOLD=

N8N_ESCALATION_WEBHOOK_URL=
```

Frontend:

```text
VITE_API_BASE_URL=http://localhost:3001/api
```

### Security

Do **not** commit:

```text
.env
node_modules/
```

API keys and Supabase service-role credentials should never be uploaded to GitHub.

---

## 🤖 AI Classification

The system supports four classifications:

| Classification     | Example                            |
| ------------------ | ---------------------------------- |
| `general_question` | "What are your business hours?"    |
| `technical_issue`  | "My dashboard is not loading."     |
| `billing`          | "I was charged twice."             |
| `urgent`           | "My account has been compromised." |

The backend validates the classification before using it.

---

## 🧑‍💼 Human Escalation

A conversation is escalated when one or more of the following conditions occur:

* AI explicitly requests escalation
* AI confidence is below the configured threshold
* Classification is `urgent`
* Request involves refunds or duplicate charges
* Request involves account deletion
* AI provider fails
* AI response is invalid
* AI response fails server-side validation

The default confidence threshold is:

```text
0.70
```

The threshold can be changed using:

```text
CONFIDENCE_THRESHOLD
```

Duplicate escalation notifications are prevented using an escalation notification check.

---

## 🔔 n8n Integration

The escalation workflow follows this flow:

```text
Application
    ↓
n8n Webhook
    ↓
Check conversation_id
    ↓
Slack Notification
    ↓
HTTP Response
```

To configure it:

1. Run n8n locally using:

```bash
npx n8n
```

or use n8n Cloud.

2. Import:

```text
n8n/escalation-workflow.json
```

3. Configure the Slack webhook.
4. Activate the workflow.
5. Add the production webhook URL to:

```text
N8N_ESCALATION_WEBHOOK_URL
```

---

## 🧪 Testing

The project includes tests using Node.js's built-in test runner.

From the backend directory:

```bash
cd server
npm install
```

Run tests using the mock provider:

```bash
AI_PROVIDER=mock npm test
```

The mock provider allows testing without requiring a real OpenAI API key.

### Tested Scenarios

* Valid AI response
* Invalid JSON
* Low-confidence response
* Urgent classification
* Refund-related requests
* Account deletion requests
* AI provider failure
* Escalation behavior
* Response validation

---

## 🔍 Manual Test Scenarios

### General Question

```text
What are your business hours?
```

Expected:

```text
general_question
```

### Technical Issue

```text
My dashboard is not loading and shows a blank screen.
```

Expected:

```text
technical_issue
```

### Billing

```text
I was charged twice for the same subscription.
```

Expected:

```text
billing
```

### Urgent

```text
My account has been compromised and I need immediate help.
```

Expected:

```text
urgent
```

Urgent and other high-risk cases should trigger the human escalation flow.

---

## 🌐 API Example

Create a conversation:

```bash
curl -X POST http://localhost:3001/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com"}'
```

The HTTP layer requires a properly configured backend and Supabase project.

---

## 🛡️ Error Handling

The application is designed to fail safely.

* LLM failure → message remains saved and conversation can be escalated
* Invalid AI JSON → response rejected and escalation triggered
* Invalid classification → response rejected
* Low confidence → escalation
* Database failure → controlled API error
* Duplicate escalation → notification is not sent repeatedly
* Empty customer message → rejected with `400`
* Secrets → never returned to the frontend

---

## 📸 Screenshots

Screenshots of the working application can be added here.

Suggested screenshots:

1. Customer support chat interface
2. General question response
3. Technical issue classification
4. Billing/urgent escalation
5. Supabase conversation/message data
6. n8n/Slack escalation notification

Example:

```text
screenshots/
├── chat-interface.png
├── billing-escalation.png
├── urgent-escalation.png
└── n8n-workflow.png
```

---

## ⚠️ Known Limitations

This project is intended as a technical challenge/demo rather than a production-ready support platform.

Current limitations include:

* No authentication system
* No dedicated human-agent dashboard
* Mock provider uses keyword matching
* Knowledge base is a plain text source rather than RAG
* No rate limiting
* No message pagination
* No production observability system
* Live third-party end-to-end testing depends on external services

---

## 🔮 Future Improvements

With additional development time, the following improvements could be added:

* Human-agent dashboard
* Customer and agent authentication
* Role-based access control
* Better logging and observability
* Automated classification evaluation
* RAG-based knowledge retrieval
* Rate limiting
* Integration tests against a dedicated Supabase test project
* End-to-end frontend tests
* Streaming AI responses

---

## 🎯 Design Principle

The most important design decision in this project is:

> **When in doubt, escalate instead of guessing.**

The AI is treated as an assistant rather than an unquestioned source of truth. Its output is validated by the backend before being used, and uncertain or sensitive situations are routed toward human intervention.

---

## 👨‍💻 Author

**Devraj Thakur**

GitHub:
https://github.com/devrajthakur1049

LinkedIn:
https://www.linkedin.com/in/devraj-thakur-847a6a252/
