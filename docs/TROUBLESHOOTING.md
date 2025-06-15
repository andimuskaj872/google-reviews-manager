# 🔧 Troubleshooting Guide

Common issues and solutions for Google Reviews Manager.

## 🚨 Common Issues

### 1. Not Receiving SMS Messages

**Symptoms:** Daily workflow runs but no SMS received

**Solutions:**
- ✅ Check Twilio account balance
- ✅ Verify phone numbers in environment variables
- ✅ Check Twilio webhook configuration
- ✅ Test with manual SMS: `POST /sms/send`

### 2. Google Authentication Errors

**Symptoms:** "Authentication failed" or token errors

**Solutions:**
- ✅ Regenerate refresh token: Visit `/auth` endpoint
- ✅ Check Google Cloud Console credentials
- ✅ Verify redirect URI matches exactly
- ✅ Ensure Google My Business API is enabled

### 3. Daily Workflow Not Running

**Symptoms:** No automatic execution at 9 PM

**Solutions:**
- ✅ Check Railway app logs for cron errors
- ✅ Verify timezone setting (America/New_York)
- ✅ Test manual trigger: `POST /daily-workflow`
- ✅ Ensure app is deployed and running

### 4. Claude API Errors

**Symptoms:** Review summarization fails

**Solutions:**
- ✅ Check Anthropic account balance/limits
- ✅ Verify API key is correct
- ✅ Check for rate limiting (wait and retry)

## 🔍 Debugging Steps

### Check App Health
```bash
curl https://your-app-name.railway.app/health
```
Should return: `{"status":"OK","timestamp":"..."}`

### Test Manual Workflow
```bash
curl -X POST https://your-app-name.railway.app/daily-workflow
```

### Check Railway Logs
1. Go to Railway dashboard
2. Select your project
3. Click "Deployments" 
4. View logs for errors

### Test SMS Functionality
```bash
curl -X POST https://your-app-name.railway.app/sms/send \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message"}'
```

## 📞 Getting Help

1. **Check this troubleshooting guide first**
2. **Search existing GitHub Issues**
3. **Create new issue** with:
   - Clear description of problem
   - Steps you've tried
   - Environment details
   - Error logs (if any)

## 🛠️ Environment Variables Checklist

Make sure all these are set correctly:

```bash
# Google My Business
✅ GOOGLE_CLIENT_ID
✅ GOOGLE_CLIENT_SECRET  
✅ GOOGLE_REDIRECT_URI (must match Railway URL)
✅ GOOGLE_REFRESH_TOKEN
✅ LOCATION_ID

# Claude API
✅ ANTHROPIC_API_KEY

# Twilio SMS
✅ TWILIO_ACCOUNT_SID
✅ TWILIO_AUTH_TOKEN
✅ TWILIO_PHONE_NUMBER
✅ NOTIFICATION_PHONE_NUMBER
```

## 🔄 Fresh Start

If all else fails, try a clean deployment:

1. **Fork the repository**
2. **Deploy fresh on Railway**
3. **Set up environment variables from scratch**
4. **Test each component individually**

Most issues are related to configuration - double-check your API keys and environment variables! 🔑