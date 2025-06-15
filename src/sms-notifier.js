import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

class SMSNotifier {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    this.toNumber = process.env.NOTIFICATION_PHONE_NUMBER;
  }

  async sendReviewSummary(summary) {
    try {
      const message = `📊 Google Reviews Summary:\n\n${summary}`;
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.toNumber
      });

      console.log('SMS sent successfully:', result.sid);
      return result;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async sendReplyConfirmation(review, suggestedReply, confirmationId) {
    try {
      const rating = '⭐'.repeat(review.starRating);
      const truncatedReview = review.comment?.length > 100 
        ? review.comment.substring(0, 100) + '...'
        : review.comment || 'No comment';
      
      const message = `🤖 Review Reply Request #${confirmationId}

📋 REVIEW:
Rating: ${rating} (${review.starRating}/5)
Customer: ${review.reviewer?.displayName || 'Anonymous'}
Review: "${truncatedReview}"

💬 SUGGESTED REPLY:
"${suggestedReply}"

Reply with:
✅ YES${confirmationId} to send
❌ NO${confirmationId} to cancel`;
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.toNumber
      });

      console.log('Reply confirmation sent:', result.sid);
      return result;
    } catch (error) {
      console.error('Error sending reply confirmation:', error);
      throw error;
    }
  }

  async sendDailyReviewPrompt(review, reviewIndex, totalReviews) {
    try {
      const rating = '⭐'.repeat(review.starRating);
      const truncatedReview = review.comment?.length > 150 
        ? review.comment.substring(0, 150) + '...'
        : review.comment || 'No comment';
      
      const message = `📝 Daily Review ${reviewIndex}/${totalReviews}

⭐ RATING: ${rating} (${review.starRating}/5)
👤 CUSTOMER: ${review.reviewer?.displayName || 'Anonymous'}
💬 REVIEW: "${truncatedReview}"

Want to reply to this review?
📱 Text REPLY${reviewIndex} to generate a response
⏭️ Text SKIP${reviewIndex} to skip this one`;
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.toNumber
      });

      console.log('Daily review prompt sent:', result.sid);
      return result;
    } catch (error) {
      console.error('Error sending daily review prompt:', error);
      throw error;
    }
  }

  async sendCustomMessage(message) {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.toNumber
      });

      console.log('Custom message sent:', result.sid);
      return result;
    } catch (error) {
      console.error('Error sending custom message:', error);
      throw error;
    }
  }
}

export default SMSNotifier;