# 🌟 Google Reviews Manager

> AI-powered Google My Business review management with automated SMS workflows

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Railway](https://img.shields.io/badge/Deploy-Railway-blueviolet.svg)](https://railway.app)

A Node.js application that automatically manages Google My Business reviews using AI-powered responses, SMS notifications, and daily automation workflows.

## Features

- 🔍 Fetch Google My Business reviews via API
- 💬 Generate AI-powered responses to reviews using Claude
- 📊 Summarize reviews with key insights
- 📱 Send SMS notifications with review summaries
- 🤖 Auto-reply to reviews with personalized responses
- ⏰ Daily automated review workflow at 9 PM NY time
- 💬 SMS-based confirmation system for review replies
- 🎯 Casual, humble response style with customer first names

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
   - Enable Google My Business API
   - Create OAuth 2.0 credentials
   - Add your redirect URI (see deployment section for URLs)

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
   In Railway dashboard → Variables tab, add:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=https://your-app-name.railway.app/auth/callback
   GOOGLE_REFRESH_TOKEN=your_refresh_token
   LOCATION_ID=your_business_location_id
   ANTHROPIC_API_KEY=your_anthropic_api_key
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   NOTIFICATION_PHONE_NUMBER=your_target_number
   ```

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

2. **Authenticate with Google:**
   - Visit `http://localhost:3000/auth` (or your Railway URL)
   - Complete OAuth flow
   - Save the refresh token to your environment variables

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
- `GET /reviews` - Fetch all reviews
- `POST /reviews/summarize` - Get AI summary of reviews
- `POST /reviews/summarize-and-send` - Summarize and send via SMS
- `POST /reviews/:reviewId/reply` - Reply to a specific review
- `POST /reviews/:reviewId/generate-reply` - Generate AI reply suggestion
- `POST /sms/send` - Send custom SMS message
- `POST /daily-workflow` - Manually trigger daily review workflow
- `POST /sms/webhook` - Twilio webhook for SMS responses

## Daily Automation

The app automatically runs every day at 9 PM NY time to:
1. Send you a review summary via SMS
2. Prompt you to reply to each review individually
3. Generate casual, humble responses for approval
4. Submit replies only after SMS confirmation

## Environment Variables

```env
# Google My Business API
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token
LOCATION_ID=your_business_location_id

# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Twilio SMS
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
NOTIFICATION_PHONE_NUMBER=your_target_number
```

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
