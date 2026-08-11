# Challenge Answers

# 1. Tell us about one technical problem you personally got stuck on.

I got stuck the most on the backend fetch call to the AI. The AI was supposed to always send back a clean JSON reply, but it didn't always do that — sometimes extra text came with it, sometimes a field was missing, and my code would just break.

At first I was directly doing `JSON.parse()` on the response assuming it'll always be correct. That broke randomly, which is bad for a support chatbot because it means the customer gets nothing back.

I checked by logging the raw AI response and running the same messages a few times to see where exactly it was breaking.

Fixed it by adding a proper check before using the AI's response — checking if it's valid JSON, if classification is one of the 4 allowed values, if confidence is between 0-1, if reply is not empty. If anything fails, instead of crashing, it just escalates to a human. That solved it.

# 2. Walk us through what you actually worked on yesterday.

Started with the backend fetch to the AI — sending the message and getting a reply back.

Then got stuck on the JSON formatting issue mentioned above, so most of yesterday went into fixing that.

Used Claude to help set up the Express routes and think through edge cases I could be missing. Checked OpenAI docs for getting cleaner JSON output, and Supabase docs for the service-role key setup.

I wrote and tested the validation logic myself, and decided what should happen when it fails (escalate, not crash).

Stopped once this was working properly and moved to the rest of the app.

# 3. Imagine this chatbot is live and suddenly starts giving customers incorrect answers. What would you investigate first, and how would you systematically narrow down the cause?

**First, I'd confirm and scope the problem.**
- Try to reproduce the exact bad answer using the same customer message, if I have it.
- Check if it's happening on one type of question (one classification) or across everything, and whether it started at a specific time — that timing usually points straight to the cause.

**Second, I'd check what changed recently**, since most "suddenly broken" issues are caused by a change, not some old bug that was always there:
1. **Deployments** — was there a recent code or config deploy? I'd diff it against the last working version.
2. **AI provider** — did the model version change silently, or did the API key/quota change? I'd check OpenAI's status page and see if the model is pinned properly in `openaiProvider.js`.
3. **Knowledge base** — was `knowledgeBase.js` edited recently? A wrong or contradictory entry there can directly cause wrong answers.
4. **Prompt/system message** — even a small wording change in the system prompt can shift how the model classifies things.
5. **Infrastructure** — Supabase issues, network problems between server and OpenAI, or n8n misconfiguration.

**Third, I'd look at actual data instead of guessing.**
- Pull recent rows from the `messages` table and look for patterns — is one classification consistently wrong? Is confidence weirdly high on bad answers, or weirdly low across the board (which would mean something is breaking validation and everything's falling through to a bad default)?
- Check logs around `aiService` and the error handler — if the AI call is silently failing and falling back to the mock provider (or the other way around), that alone would explain answers looking off.
- Double check `validateAiOutput()` is still catching bad responses the way it's supposed to — maybe even write a quick test using the last few days of logged AI responses.

**Fourth, contain it, then actually fix it.**
- If the AI provider itself seems to be the problem, I'd lower the confidence threshold temporarily (so more things escalate to a human) or just switch to `AI_PROVIDER=mock`/a known-good model as a stopgap so customers aren't getting wrong answers while I dig into the root cause.
- Once I find the actual cause (bad prompt, bad KB entry, provider issue, whatever), I'd fix that specific thing, add a test that would've caught it, and redeploy.
- After that, I'd add some monitoring for whatever failure mode slipped through this time (like a spike in low-confidence responses, or a spike in one classification, or a rise in AI errors) so next time it gets caught automatically instead of from a customer complaint.





# TESTING QUESTIONS


I tested the following scenarios:

* General customer question
* Technical issue
* Billing issue
* Urgent/security issue
* Human handoff/escalation for urgent cases

The AI classification, response flow, and escalation behavior are working as expected.
git init


1. General Question

What are your business hours?

2. Technical Issue

My dashboard is not loading and shows a blank screen.

3. Billing Issue

I was charged twice for the same subscription.

4. Urgent Issue

My account has been compromised and I need immediate help.

5. Human Handoff

I want a refund for a duplicate charge on my account.