# 🌟 Google Reviews Manager

> AI-powered Google My Business review management with automated SMS workflows

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Railway](https://img.shields.io/badge/Deploy-Railway-blueviolet.svg)](https://railway.app)

A Node.js application that automatically manages Google My Business reviews using AI-powered responses, SMS notifications, real-time analytics dashboard, and daily automation workflows.

## Features

- 🔍 Fetch Google My Business reviews via API
- 💬 Generate AI-powered responses to reviews using Claude
- 📊 Summarize reviews with key insights
- 📱 Send SMS notifications with review summaries
- 🤖 Auto-reply to reviews with personalized responses
- ⏰ Daily automated review workflow at 9 PM NY time
- 💬 SMS-based confirmation system for review replies
- 🎯 Casual, humble response style with customer first names
- 📈 **Analytics Dashboard** - Real-time review analytics with sentiment analysis
- 🧠 **AI-Powered Insights** - Smart business performance analysis
- 📊 **MCP Integration** - Model Context Protocol for advanced analytics

## Setup

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in your API keys and configuration

### API Setup

3. **Google My Business API Setup:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable "My Business Business Information API"
   - Create OAuth 2.0 credentials
   - Add your redirect URI (see deployment section for URLs)
   - **⚠️ IMPORTANT: Request API Quota Increase**
     - Go to APIs & Services → Quotas
     - Search for "Business Information API"
     - The default quota is 0 requests/minute (disabled)
     - Click "Edit Quotas" and request an increase (e.g., 100 requests/day)
     - Google typically takes 1-7 days to approve quota requests
     - You may need to provide business verification details

4. **Claude API Setup:**
   - Get API key from [Anthropic Console](https://console.anthropic.com/)
   - Add to environment variables

5. **Twilio SMS Setup:**
   - Create account at [Twilio](https://www.twilio.com/)
   - Get Account SID, Auth Token, and phone number
   - Add to environment variables

## Deployment (Railway)

This app is designed to run 24/7 in the cloud for automated daily reviews.

### Deploy to Railway

1. **Sign up for Railway:**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Deploy from GitHub:**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `google-reviews-manager` repository
   - Click "Deploy Now"

3. **Add Environment Variables:**
   In Railway dashboard → Variables tab, add all variables from [`.env.example`](.env.example), but update:
   - `GOOGLE_REDIRECT_URI=https://your-app-name.railway.app/auth/callback`
   - `USE_MOCK_DATA=false` (for production mode)

4. **Update Google OAuth:**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Edit your OAuth 2.0 client
   - Add redirect URI: `https://your-app-name.railway.app/auth/callback`

5. **Configure Twilio Webhook:**
   - Go to Twilio Console → Phone Numbers → Active Numbers
   - Click your Twilio number
   - Set webhook URL: `https://your-app-name.railway.app/sms/webhook`
   - Set method to "POST"

6. **Test Deployment:**
   - Health check: Visit `https://your-app-name.railway.app/health`
   - Should return: `{"status":"OK","timestamp":"..."}`
   - Test workflow: `curl -X POST https://your-app-name.railway.app/daily-workflow`

## Usage

### Local Development
1. **Start the application:**
   ```bash
   npm start
   ```

2. **Access the analytics dashboard:**
   - Visit `http://localhost:3000/dashboard` to view the analytics web interface
   - Or visit `http://localhost:3000` (redirects to dashboard)

3. **Authenticate with Google:**
   - Visit `http://localhost:3000/auth` (or your Railway URL)
   - Complete OAuth flow
   - Save the refresh token to your environment variables

4. **Test with mock data:**
   - Trigger `curl -X POST http://localhost:3000/daily-workflow` to populate analytics with sample reviews
   - View the populated dashboard to see sentiment analysis, rating distribution, and insights

### Cloud Deployment
Once deployed on Railway, your app runs automatically 24/7:

1. **Automatic Daily Reviews:** App runs every day at 9 PM NY time
2. **SMS Interaction:** Respond to SMS prompts with commands like:
   - `REPLY1` - Generate response for review #1
   - `SKIP2` - Skip review #2  
   - `YES[ID]` - Approve a generated reply
   - `NO[ID]` - Cancel a reply

3. **Manual Testing:**
   - Check status: Visit `https://your-app-name.railway.app/health`
   - Trigger workflow: `curl -X POST https://your-app-name.railway.app/daily-workflow`

### API Endpoints

#### Review Management
- `GET /reviews` - Fetch all reviews
- `POST /reviews/summarize` - Get AI summary of reviews
- `POST /reviews/summarize-and-send` - Summarize and send via SMS
- `POST /reviews/:reviewId/reply` - Reply to a specific review
- `POST /reviews/:reviewId/generate-reply` - Generate AI reply suggestion

#### Analytics Dashboard
- `GET /dashboard` - Web analytics dashboard
- `GET /analytics/report` - Comprehensive analytics report
- `GET /analytics/insights` - AI-powered insights
- `GET /analytics/sentiment-trends` - Sentiment analysis over time
- `GET /analytics/response-metrics` - Response performance data
- `GET /analytics/rating-distribution` - Star rating breakdown
- `GET /analytics/daily-summary` - Daily review statistics

#### Workflow & Communication
- `POST /sms/send` - Send custom SMS message
- `POST /daily-workflow` - Manually trigger daily review workflow
- `POST /sms/webhook` - Twilio webhook for SMS responses

## 📊 Analytics Dashboard

### Web Interface
Visit `http://localhost:3000/dashboard` (or your Railway URL) to access the analytics dashboard featuring:

- **📈 Real-time Metrics** - Total reviews, average rating, response rate, AI response count
- **🧠 AI-Powered Insights** - Natural language analysis of your business performance
- **😊 Sentiment Analysis** - Visual breakdown of positive, neutral, and negative reviews
- **⭐ Rating Distribution** - Interactive star rating breakdown with progress bars
- **📝 Recent Reviews** - Latest reviews with sentiment labels and reply status
- **🔄 Auto-refresh** - Dashboard updates every 30 seconds automatically

### Analytics Features
- **Sentiment Analysis** - Automatic categorization of reviews using NLP
- **Response Tracking** - Monitor both AI-generated and manual responses
- **Performance Metrics** - Track response rates, average response times
- **Historical Data** - Sentiment trends and rating patterns over time
- **MCP Integration** - Built with Model Context Protocol for advanced analytics

## Daily Automation

The app automatically runs every day at 9 PM NY time to:
1. Send you a review summary via SMS
2. Prompt you to reply to each review individually
3. Generate casual, humble responses for approval
4. Submit replies only after SMS confirmation
5. **Track all reviews and responses in analytics automatically**

## 🧪 Demo vs Production Mode

The app supports both demo and production modes:

### Demo Mode (`USE_MOCK_DATA=true`)
- ✅ Test the complete SMS workflow
- ✅ See how AI responses work  
- ✅ Try the daily automation
- ✅ Deploy without real Google reviews
- ✅ Safe for development and testing

### Production Mode (`USE_MOCK_DATA=false`)
- 🔴 Fetches **real reviews** from your Google My Business
- 🔴 Posts **real replies** to Google (when approved)
- 🔴 Requires proper Google API setup and permissions
- 🔴 Use with caution - affects your actual business listing

**To switch to real data:** Set `USE_MOCK_DATA=false` in your Railway environment variables.

## Environment Variables

See the [`.env.example`](.env.example) file for all required environment variables and their descriptions. Copy this file to `.env` and fill in your actual values.

## Development

```bash
npm run dev
```

## Testing

```bash
npm test
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Areas for Contribution
- 🔌 Real Google My Business API integration
- 🎨 Web dashboard for review management  
- 🧪 Unit tests and integration tests
- 🐳 Docker deployment options
- 📚 Documentation improvements

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Claude](https://anthropic.com) for AI-powered review responses
- [Twilio](https://twilio.com) for SMS notifications
- [Railway](https://railway.app) for cloud deployment
- [Google My Business API](https://developers.google.com/my-business) for review management

## ⭐ Star This Repository

If this project helped you, please give it a star! It helps others discover this tool.

---

**Made with ❤️ for business owners who care about customer feedback**
