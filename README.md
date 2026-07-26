# Event Genie AI 🎉

## a. What it does & Problem it solves
**Problem:** Planning events in Pakistan is stressful. People forget tasks, go over budget, and waste hours on Google for ideas.
**Solution:** Event Genie AI is an AI-powered app that creates a complete event plan, budget in PKR, and task checklist in 30 seconds.
**For whom:** Students, families, and small event planners.

## b. Live Deployed URL
[https://dream-event-spark.lovable.app](https://dream-event-spark.lovable.app)

## c. Features List
- **AI Event Planner**: Get full event plan from just 1 line
- **Budget Estimator**: AI breakdown in PKR
- **Task Checklist**: Timeline with deadlines
- **Ideas**: Food, decoration, and activity suggestions
- **Mobile Responsive**: Works on all devices

## d. AI Feature
**What it does:** Takes event type + guest count + budget and returns complete plan.
**System Prompt:**
`You are Event Genie, an expert event planner in Pakistan. Return JSON with: title, 5-point checklist with dates, budget breakdown in PKR, 3 vendor/idea suggestions. Keep tone friendly and practical.`
**Model Used:** GPT-4o via Lovable

## e. Tools & Services Used
- **Frontend:** React, Vite, Tailwind CSS, TanStack
- **AI:** Lovable.dev + GPT-4o
- **Deployment:** Lovable Hosting
- **Version Control:** GitHub

## f. Screenshots
![Homepage](screenshot1.png)
![AI Planner](screenshot2.png)
![Budget Page](screenshot3.png)

## g. How to run locally
1. `git clone https://github.com/marwahikram693-dotcom/dream-event-spark.git`
2. `npm install`
3. `npm run dev`
4. Open http://localhost:5173
