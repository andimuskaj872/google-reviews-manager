import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

class ReviewSummarizer {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async summarizeReviews(reviews) {
    try {
      const reviewTexts = reviews.map(review => 
        `Rating: ${review.starRating}/5 - ${review.comment || 'No comment'}`
      ).join('\n\n');

      const prompt = `Please provide a concise summary of these business reviews:

${reviewTexts}

Include:
1. Overall sentiment
2. Average rating
3. Common themes or issues mentioned
4. Key strengths highlighted
5. Areas for improvement
6. Total number of reviews analyzed

Keep the summary professional and actionable.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are a helpful assistant that analyzes customer reviews for businesses.\n\n${prompt}`
          }
        ]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Error summarizing reviews:', error);
      throw error;
    }
  }

  async generateReviewResponse(review) {
    try {
      // Extract first name from reviewer display name
      const reviewerName = review.reviewer?.displayName || 'there';
      const firstName = reviewerName.split(' ')[0];
      
      // Use template-based approach for consistent casual style
      const rating = review.starRating;
      const comment = review.comment || '';
      
      let response = `Hi ${firstName}, `;
      
      if (rating >= 4) {
        // Check for mixed feedback even in positive reviews
        if (comment.toLowerCase().includes('wait') || comment.toLowerCase().includes('slow') || comment.toLowerCase().includes('long')) {
          response += "thanks for the honest feedback! You're absolutely right about the wait time - we're working on that. ";
          if (comment.toLowerCase().includes('food') || comment.toLowerCase().includes('delicious')) {
            response += "So glad you still enjoyed the food though! ";
          }
          response += "Hope to see you again soon!";
        } else {
          // Pure positive review
          const positiveResponses = [
            "thank you so much! Really appreciate you taking the time to share this.",
            "wow, thank you! Your kind words made our day.",
            "this is amazing feedback - thank you for making our day!",
            "thanks for the love! So glad you enjoyed everything."
          ];
          response += positiveResponses[Math.floor(Math.random() * positiveResponses.length)];
          
          if (comment.toLowerCase().includes('food') || comment.toLowerCase().includes('delicious')) {
            response += " So happy you loved the food!";
          }
          response += " Hope to see you again soon!";
        }
      } else {
        // Mixed/negative review template
        response += "thanks for the honest feedback! ";
        
        if (comment.toLowerCase().includes('wait') || comment.toLowerCase().includes('slow')) {
          response += "You're absolutely right about the wait time - we're working on that. ";
        }
        
        response += "Really appreciate you taking the time to help us improve! Hope to see you again soon!";
      }
      
      return response;
    } catch (error) {
      console.error('Error generating review response:', error);
      throw error;
    }
  }
}

export default ReviewSummarizer;