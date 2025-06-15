import express from 'express';
import cron from 'node-cron';
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

// Daily review workflow function
async function runDailyReviewWorkflow() {
  try {
    console.log('Starting daily review workflow...');
    
    // Get all reviews for summary
    const allReviews = await googleClient.getAllReviews();
    
    // Get only unreplied reviews for individual processing
    const unrepliedReviews = await googleClient.getReviews();
    
    if (allReviews.length === 0) {
      await smsNotifier.sendCustomMessage('📊 Daily Review Update: No reviews found!');
      return;
    }
    
    // Send summary of ALL reviews first
    const summary = await reviewSummarizer.summarizeReviews(allReviews);
    await smsNotifier.sendReviewSummary(summary);
    
    if (unrepliedReviews.length === 0) {
      await smsNotifier.sendCustomMessage('✅ All reviews have been replied to! No action needed.');
      return;
    }
    
    // Store only unreplied reviews for individual processing
    dailyReviews = unrepliedReviews;
    currentReviewIndex = 0;
    
    await smsNotifier.sendCustomMessage(`📝 Found ${unrepliedReviews.length} review(s) that need replies. Starting individual review process...`);
    
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