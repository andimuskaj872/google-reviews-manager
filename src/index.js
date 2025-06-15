import express from 'express';
import cron from 'node-cron';
import fs from 'fs/promises';
import GoogleBusinessClient from './google-business-client.js';
import ReviewSummarizer from './review-summarizer.js';
import SMSNotifier from './sms-notifier.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const googleClient = new GoogleBusinessClient();
const reviewSummarizer = new ReviewSummarizer();
const smsNotifier = new SMSNotifier();

// Simple in-memory storage for pending replies
const pendingReplies = new Map();

// Storage for daily review workflow
let dailyReviews = [];
let currentReviewIndex = 0;

// Timestamp tracking
const TIMESTAMP_FILE = '/tmp/last-review-check.json';

async function getLastCheckTimestamp() {
  try {
    const data = await fs.readFile(TIMESTAMP_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return new Date(parsed.timestamp);
  } catch (error) {
    // First run or file doesn't exist
    return null;
  }
}

async function saveLastCheckTimestamp() {
  const timestamp = new Date().toISOString();
  try {
    await fs.writeFile(TIMESTAMP_FILE, JSON.stringify({ timestamp }));
  } catch (error) {
    console.error('Error saving timestamp:', error);
  }
}

// Daily review workflow function
async function runDailyReviewWorkflow() {
  try {
    console.log('Starting daily review workflow...');
    
    // Get timestamp of last check
    const lastCheckTime = await getLastCheckTimestamp();
    
    // Get only new reviews since last check (for summary)
    const newReviews = await googleClient.getReviews(lastCheckTime);
    
    // Get ALL unreplied reviews (for individual processing)
    const allUnrepliedReviews = await googleClient.getReviews(); // No timestamp filter
    
    // Send summary of NEW reviews if any
    if (newReviews.length > 0) {
      const summary = await reviewSummarizer.summarizeReviews(newReviews);
      const timeStr = lastCheckTime ? 
        `since ${lastCheckTime.toLocaleDateString()}` : 
        'recent';
        
      await smsNotifier.sendCustomMessage(`📊 New Reviews Summary (${timeStr}):\n\n${summary}`);
    } else {
      const timeStr = lastCheckTime ? 
        `since ${lastCheckTime.toLocaleDateString()} ${lastCheckTime.toLocaleTimeString()}` : 
        'today';
      
      await smsNotifier.sendCustomMessage(`📊 Daily Review Update: No new reviews ${timeStr}.`);
    }
    
    // Check for ALL unreplied reviews (including old ones)
    if (allUnrepliedReviews.length === 0) {
      await smsNotifier.sendCustomMessage(`✅ All reviews have been replied to! Your business is all caught up! 👍`);
      
      // Save timestamp even when no action needed
      await saveLastCheckTimestamp();
      return;
    }
    
    // Store ALL unreplied reviews for individual processing (new + old unreplied)
    dailyReviews = allUnrepliedReviews;
    currentReviewIndex = 0;
    
    const newCount = newReviews.length;
    const totalCount = allUnrepliedReviews.length;
    const oldCount = totalCount - newCount;
    
    let message = `📝 Found ${totalCount} review(s) that need replies`;
    if (newCount > 0 && oldCount > 0) {
      message += ` (${newCount} new, ${oldCount} previous)`;
    } else if (oldCount > 0) {
      message += ` (all from previous days)`;
    }
    message += '. Starting individual review process...';
    
    await smsNotifier.sendCustomMessage(message);
    
    // Save timestamp before processing individual reviews
    await saveLastCheckTimestamp();
    
    // Wait a moment, then start sending individual review prompts
    setTimeout(async () => {
      await sendNextReviewPrompt();
    }, 3000);
    
  } catch (error) {
    console.error('Error in daily review workflow:', error);
    await smsNotifier.sendCustomMessage('❌ Error running daily review check. Please check the app.');
  }
}

// Function to send the next review prompt
async function sendNextReviewPrompt() {
  if (currentReviewIndex >= dailyReviews.length) {
    await smsNotifier.sendCustomMessage('✅ Daily review workflow complete! All reviews processed.');
    return;
  }
  
  const review = dailyReviews[currentReviewIndex];
  await smsNotifier.sendDailyReviewPrompt(review, currentReviewIndex + 1, dailyReviews.length);
}

// OAuth flow routes
app.get('/auth', async (req, res) => {
  try {
    const authUrl = await googleClient.getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const tokens = await googleClient.setAccessToken(code);
    res.json({ 
      message: 'Authentication successful!', 
      refresh_token: tokens.refresh_token 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Review management routes
app.get('/reviews', async (req, res) => {
  try {
    const reviews = await googleClient.getReviews();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/reviews/summarize', async (req, res) => {
  try {
    const reviews = await googleClient.getReviews();
    const summary = await reviewSummarizer.summarizeReviews(reviews);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/reviews/summarize-and-send', async (req, res) => {
  try {
    const reviews = await googleClient.getReviews();
    const summary = await reviewSummarizer.summarizeReviews(reviews);
    await smsNotifier.sendReviewSummary(summary);
    res.json({ message: 'Summary sent via SMS', summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/reviews/:reviewId/reply', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { message } = req.body;
    
    const result = await googleClient.replyToReview(reviewId, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/reviews/:reviewId/generate-reply', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const reviews = await googleClient.getReviews();
    const review = reviews.find(r => r.name === reviewId);
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    const suggestedReply = await reviewSummarizer.generateReviewResponse(review);
    
    // Generate unique confirmation ID
    const confirmationId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Store pending reply
    pendingReplies.set(confirmationId, {
      reviewId,
      review,
      suggestedReply,
      timestamp: new Date().toISOString()
    });
    
    // Send SMS confirmation
    await smsNotifier.sendReplyConfirmation(review, suggestedReply, confirmationId);
    
    res.json({ 
      message: 'Reply generated and confirmation sent via SMS',
      confirmationId,
      suggestedReply 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SMS webhook to handle replies
app.post('/sms/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { Body, From } = req.body;
    const message = Body.trim().toUpperCase();
    
    console.log('Received SMS:', message, 'from:', From);
    
    // Check for various command patterns
    const yesMatch = message.match(/^YES([A-Z0-9]{6})$/);
    const noMatch = message.match(/^NO([A-Z0-9]{6})$/);
    const replyMatch = message.match(/^REPLY(\d+)$/);
    const skipMatch = message.match(/^SKIP(\d+)$/);
    
    if (replyMatch) {
      const reviewIndex = parseInt(replyMatch[1]) - 1;
      
      if (reviewIndex >= 0 && reviewIndex < dailyReviews.length) {
        const review = dailyReviews[reviewIndex];
        const suggestedReply = await reviewSummarizer.generateReviewResponse(review);
        
        // Generate confirmation ID for this reply
        const confirmationId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Store pending reply
        pendingReplies.set(confirmationId, {
          reviewId: review.name,
          review,
          suggestedReply,
          timestamp: new Date().toISOString()
        });
        
        // Send confirmation SMS
        await smsNotifier.sendReplyConfirmation(review, suggestedReply, confirmationId);
        
        // Move to next review after a delay
        currentReviewIndex = reviewIndex + 1;
        setTimeout(async () => {
          await sendNextReviewPrompt();
        }, 2000);
      } else {
        await smsNotifier.sendCustomMessage(`❌ Invalid review number: ${replyMatch[1]}`);
      }
    } else if (skipMatch) {
      const reviewIndex = parseInt(skipMatch[1]) - 1;
      
      if (reviewIndex >= 0 && reviewIndex < dailyReviews.length) {
        await smsNotifier.sendCustomMessage(`⏭️ Skipped review ${skipMatch[1]}`);
        
        // Move to next review
        currentReviewIndex = reviewIndex + 1;
        setTimeout(async () => {
          await sendNextReviewPrompt();
        }, 1000);
      } else {
        await smsNotifier.sendCustomMessage(`❌ Invalid review number: ${skipMatch[1]}`);
      }
    } else if (yesMatch) {
      const confirmationId = yesMatch[1];
      const pendingReply = pendingReplies.get(confirmationId);
      
      if (pendingReply) {
        // Submit the reply
        const result = await googleClient.replyToReview(
          pendingReply.reviewId, 
          pendingReply.suggestedReply
        );
        
        pendingReplies.delete(confirmationId);
        
        await smsNotifier.sendCustomMessage(
          `✅ Reply submitted successfully for confirmation #${confirmationId}`
        );
      } else {
        await smsNotifier.sendCustomMessage(
          `❌ Confirmation #${confirmationId} not found or expired`
        );
      }
    } else if (noMatch) {
      const confirmationId = noMatch[1];
      const pendingReply = pendingReplies.get(confirmationId);
      
      if (pendingReply) {
        pendingReplies.delete(confirmationId);
        await smsNotifier.sendCustomMessage(
          `❌ Reply cancelled for confirmation #${confirmationId}`
        );
      } else {
        await smsNotifier.sendCustomMessage(
          `❌ Confirmation #${confirmationId} not found`
        );
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).send('Error');
  }
});

// Utility routes
app.post('/sms/send', async (req, res) => {
  try {
    const { message } = req.body;
    const result = await smsNotifier.sendCustomMessage(message);
    res.json({ message: 'SMS sent successfully', messageId: result.sid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debug endpoint to see raw review data
app.get('/debug/reviews', async (req, res) => {
  try {
    console.log('=== DEBUG: Fetching reviews ===');
    
    // Test API connection directly
    let apiError = null;
    let realReviews = [];
    
    try {
      console.log('Testing direct Google My Business API call...');
      const response = await googleClient.businessInfo.locations.reviews.list({
        parent: `locations/${process.env.LOCATION_ID}`,
        auth: googleClient.oauth2Client,
        pageSize: 50,
        orderBy: 'updateTime desc'
      });
      realReviews = response.data.reviews || [];
      console.log(`Direct API call successful: ${realReviews.length} reviews`);
    } catch (error) {
      apiError = {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details
      };
      console.error('Direct API call failed:', apiError);
    }
    
    // Get all reviews using existing method (may fall back to mock)
    const allReviews = await googleClient.getAllReviews();
    console.log(`getAllReviews() returned: ${allReviews.length} reviews`);
    
    // Count reviews with/without replies
    const withReplies = allReviews.filter(r => r.reviewReply).length;
    const withoutReplies = allReviews.filter(r => !r.reviewReply).length;
    
    console.log(`Reviews with replies: ${withReplies}`);
    console.log(`Reviews without replies: ${withoutReplies}`);
    
    // Get actionable reviews (what the workflow uses)
    const actionableReviews = await googleClient.getReviews();
    console.log(`Actionable reviews: ${actionableReviews.length}`);
    
    // Check if we're getting mock data by comparing first review
    const isMockData = allReviews.length > 0 && 
      allReviews[0].comment?.includes('Amazing Chinese food! The Beijing duck');
    
    res.json({
      apiError,
      totalReviews: allReviews.length,
      realApiReviews: realReviews.length,
      withReplies,
      withoutReplies,
      actionableReviews: actionableReviews.length,
      usingMockData: process.env.USE_MOCK_DATA === 'true',
      actuallyMockData: isMockData,
      locationId: process.env.LOCATION_ID,
      hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      sampleReviews: allReviews.slice(0, 3).map(r => ({
        starRating: r.starRating,
        hasReply: !!r.reviewReply,
        createTime: r.createTime,
        comment: r.comment?.substring(0, 100) + '...'
      }))
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Schedule daily review workflow at 9 PM NY time (America/New_York timezone)
cron.schedule('0 21 * * *', runDailyReviewWorkflow, {
  timezone: 'America/New_York'
});

// Add endpoint to manually trigger daily workflow for testing
app.post('/daily-workflow', async (req, res) => {
  try {
    await runDailyReviewWorkflow();
    res.json({ message: 'Daily review workflow started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Google Reviews Manager running on http://localhost:${port}`);
  console.log(`Visit http://localhost:${port}/auth to start OAuth flow`);
  console.log(`Daily review workflow scheduled for 9 PM NY time`);
});

export default app;