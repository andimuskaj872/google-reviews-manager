import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

class GoogleBusinessClient {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }

    // Using the Business Profile API for reviews
    this.businessprofile = google.businessprofileperformance('v1');
    this.locationId = process.env.LOCATION_ID;
  }

  async getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/business.manage'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async setAccessToken(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async getReviews() {
    try {
      // For now, return mock data to test the summarization
      return [
        {
          name: 'accounts/123/locations/456/reviews/review1',
          starRating: 5,
          comment: 'Amazing Chinese food! The Beijing duck was perfectly cooked and the service was excellent. Will definitely come back!',
          createTime: '2024-01-15T10:30:00Z',
          reviewer: { displayName: 'John D.' }
        },
        {
          name: 'accounts/123/locations/456/reviews/review2', 
          starRating: 4,
          comment: 'Good food but the wait time was a bit long. The dumplings were delicious though.',
          createTime: '2024-01-10T19:45:00Z',
          reviewer: { displayName: 'Sarah M.' }
        },
        {
          name: 'accounts/123/locations/456/reviews/review3',
          starRating: 5,
          comment: 'Best Chinese restaurant in the area! Fresh ingredients and authentic flavors.',
          createTime: '2024-01-08T14:20:00Z',
          reviewer: { displayName: 'Mike R.' }
        }
      ];
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
  }

  async replyToReview(reviewName, replyText) {
    try {
      // TESTING MODE - Not actually submitting to Google
      console.log('TEST MODE: Would reply to review:', reviewName);
      console.log('TEST MODE: Reply text:', replyText);
      
      return {
        message: 'TEST MODE: Reply not actually submitted',
        reviewName,
        replyText,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error replying to review:', error);
      throw error;
    }
  }

  async deleteReviewReply(reviewName) {
    try {
      const auth = this.oauth2Client;
      const request = {
        name: reviewName,
        auth: auth
      };

      const response = await this.mybusiness.accounts.locations.reviews.deleteReply(request);
      return response.data;
    } catch (error) {
      console.error('Error deleting review reply:', error);
      throw error;
    }
  }
}

export default GoogleBusinessClient;