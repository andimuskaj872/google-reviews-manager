# Google Reviews Manager

A Node.js application to manage Google My Business reviews - fetch, respond, summarize, and send SMS notifications.

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

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in your API keys and configuration

3. **Google My Business API Setup:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google My Business API
   - Create OAuth 2.0 credentials
   - Add your redirect URI: `http://localhost:3000/auth/callback`

4. **Claude API Setup:**
   - Get API key from [Anthropic Console](https://console.anthropic.com/)
   - Add to `.env` file

5. **Twilio SMS Setup:**
   - Create account at [Twilio](https://www.twilio.com/)
   - Get Account SID, Auth Token, and phone number
   - Add to `.env` file

## Usage

1. **Start the application:**
   ```bash
   npm start
   ```

2. **Authenticate with Google:**
   - Visit `http://localhost:3000/auth`
   - Complete OAuth flow
   - Save the refresh token to your `.env` file

3. **API Endpoints:**
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

## License

MIT
