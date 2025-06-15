# 🔄 Daily Workflow Example

This document shows how the automated daily workflow works.

## 📅 Daily Schedule

Every day at **9:00 PM NY time**, the app automatically:

1. **Fetches reviews** from Google My Business
2. **Sends summary** via SMS  
3. **Prompts for individual replies** one by one

## 📱 SMS Interaction Flow

### Step 1: Daily Summary
```
📊 Google Reviews Summary:

Summary of Business Reviews:

1. Overall Sentiment: Overwhelmingly positive
2. Average Rating: 4.67 out of 5
3. Common Themes: Delicious food, authentic flavors
4. Key Strengths: Fresh ingredients, excellent service
5. Areas for Improvement: Wait times during peak hours
6. Total Reviews: 3
```

### Step 2: Individual Review Prompts
```
📝 Daily Review 1/3

⭐ RATING: ⭐⭐⭐⭐⭐ (5/5)
👤 CUSTOMER: John D.
💬 REVIEW: "Amazing Chinese food! The Beijing duck was perfectly cooked and the service was excellent. Will definitely come back!"

Want to reply to this review?
📱 Text REPLY1 to generate a response
⏭️ Text SKIP1 to skip this one
```

### Step 3: Reply Generation
**You text:** `REPLY1`

**App responds with confirmation:**
```
🤖 Review Reply Request #ABC123

📋 REVIEW:
Rating: ⭐⭐⭐⭐⭐ (5/5)
Customer: John D.
Review: "Amazing Chinese food! The Beijing duck was perfectly cooked..."

💬 SUGGESTED REPLY:
"Hi John, this is amazing feedback - thank you for making our day! So happy you loved the food! Hope to see you again soon!"

Reply with:
✅ YESABC123 to send
❌ NOABC123 to cancel
```

### Step 4: Final Confirmation
**You text:** `YESABC123`

**App responds:**
```
✅ Reply submitted successfully for confirmation #ABC123
```

## 🎯 Benefits

- **Zero effort** - Runs automatically every day
- **Quality control** - You approve every response
- **Consistent tone** - AI maintains your casual, humble style
- **Time saving** - No need to manually check for reviews
- **Customer engagement** - Timely responses show you care

## ⚙️ Manual Testing

You can also trigger the workflow manually:
```bash
curl -X POST https://your-app-name.railway.app/daily-workflow
```