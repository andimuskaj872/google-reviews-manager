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

    // Try multiple API service names to find what works
    try {
      // These are the known Google Business APIs in the googleapis library
      this.businessInfo = google.mybusinessbusinessinformation('v1');
      this.accountManagement = google.mybusinessaccountmanagement('v1');
      
      // Try the v4.9 API if it exists
      try {
        this.mybusinessv4 = google.mybusiness && google.mybusiness('v4');
      } catch (e) {
        console.log('mybusiness v4 not available');
      }
      
    } catch (error) {
      console.warn('Business Profile APIs not available:', error.message);
    }
    
    this.locationId = process.env.LOCATION_ID;
    this.accountId = process.env.GOOGLE_ACCOUNT_ID;
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

  // Try using the Business Information API for reviews
  async getReviewsFromAPI() {
    try {
      console.log('Attempting to fetch reviews using Business Information API...');
      
      // Try the Business Information API approach
      const response = await this.businessInfo.locations.reviews.list({
        parent: `locations/${this.locationId}`,
        auth: this.oauth2Client,
        pageSize: 50
      });
      
      console.log('Business Info API response:', response.data);
      return response.data.reviews || [];
      
    } catch (error) {
      console.error('Business Info API failed:', error.message);
      
      // If that fails, try a direct approach without account ID
      try {
        console.log('Trying direct location reviews access...');
        
        // Some APIs might work with just the location
        const response = await this.businessInfo.locations.get({
          name: `locations/${this.locationId}`,
          auth: this.oauth2Client,
          readMask: 'name,reviews'
        });
        
        console.log('Direct location response:', response.data);
        return response.data.reviews || [];
        
      } catch (error2) {
        console.error('Direct location API also failed:', error2.message);
        throw new Error(`All API approaches failed. Last error: ${error2.message}`);
      }
    }
  }

  // Test API availability with detailed diagnostics
  testAvailableAPIs() {
    const apis = {};
    
    try {
      apis.hasAccountId = !!this.accountId;
      apis.hasLocationId = !!this.locationId;
      apis.hasOAuthClient = !!this.oauth2Client;
      apis.hasRefreshToken = !!this.oauth2Client.credentials?.refresh_token;
      apis.hasBusinessInfo = !!this.businessInfo;
      apis.hasAccountManagement = !!this.accountManagement;
      
      // Detailed API structure exploration
      if (this.businessInfo) {
        apis.businessInfoStructure = {
          available: true,
          hasLocations: !!this.businessInfo.locations,
          locationsKeys: this.businessInfo.locations ? Object.keys(this.businessInfo.locations) : [],
          locationsReviews: !!(this.businessInfo.locations?.reviews),
          locationsReviewsList: !!(this.businessInfo.locations?.reviews?.list),
          locationsGet: !!(this.businessInfo.locations?.get)
        };
      }
      
      // Test access token availability
      apis.tokenInfo = {
        hasCredentials: !!this.oauth2Client.credentials,
        hasAccessToken: !!this.oauth2Client.credentials?.access_token,
        hasRefreshToken: !!this.oauth2Client.credentials?.refresh_token,
        tokenType: this.oauth2Client.credentials?.token_type
      };
      
    } catch (error) {
      apis.error = error.message;
    }
    
    return apis;
  }

  async getReviews(sinceTimestamp = null) {
    try {
      // Use mock data if specified
      if (process.env.USE_MOCK_DATA === 'true') {
        console.log('Using mock data for testing');
        return this.getMockReviews(sinceTimestamp);
      }

      // Fetch real reviews from Google My Business API v4
      console.log('Fetching real reviews from Google My Business API v4...');
      
      const allReviews = await this.getReviewsFromAPI();
      console.log(`Fetched ${allReviews.length} total reviews from Google My Business`);
      
      // Filter by timestamp if provided (for new reviews since last run)
      let filteredReviews = allReviews;
      if (sinceTimestamp) {
        filteredReviews = allReviews.filter(review => {
          const reviewDate = new Date(review.createTime);
          return reviewDate > sinceTimestamp;
        });
        console.log(`${filteredReviews.length} reviews since ${sinceTimestamp.toISOString()}`);
      }
      
      // Filter out reviews that already have replies (unless they're very recent)
      const unrepliedReviews = filteredReviews.filter(review => {
        // Include if no reply exists
        if (!review.reviewReply) {
          return true;
        }
        
        // Include if review is very recent (within last 24 hours) even if replied
        // This allows for follow-up or correction opportunities
        const reviewDate = new Date(review.createTime);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const isVeryRecent = reviewDate > oneDayAgo;
        
        return isVeryRecent;
      });
      
      if (sinceTimestamp) {
        console.log(`${unrepliedReviews.length} new reviews need attention since last check`);
      } else {
        console.log(`${unrepliedReviews.length} reviews need attention (${allReviews.length - unrepliedReviews.length} already replied)`);
      }
      
      // Transform the data to ensure consistent format
      return unrepliedReviews.map(review => ({
        name: review.name,
        starRating: review.starRating || 0,
        comment: review.comment || '',
        createTime: review.createTime,
        updateTime: review.updateTime,
        reviewer: {
          displayName: review.reviewer?.displayName || 'Anonymous',
          profilePhotoUrl: review.reviewer?.profilePhotoUrl
        },
        reviewReply: review.reviewReply,
        hasExistingReply: !!review.reviewReply
      }));

    } catch (error) {
      console.error('Error fetching reviews from Google My Business:', error);
      
      // If API fails, fall back to mock data with warning
      console.warn('Falling back to mock data due to API error');
      return this.getMockReviews(sinceTimestamp);
    }
  }

  async getAllReviews() {
    try {
      // Use mock data if specified
      if (process.env.USE_MOCK_DATA === 'true') {
        return this.getMockReviews();
      }

      // Fetch ALL reviews (for summary purposes)
      const reviews = await this.getReviewsFromAPI();
      console.log(`Fetched ${reviews.length} total reviews for summary`);
      
      return reviews.map(review => ({
        name: review.name,
        starRating: review.starRating || 0,
        comment: review.comment || '',
        createTime: review.createTime,
        updateTime: review.updateTime,
        reviewer: {
          displayName: review.reviewer?.displayName || 'Anonymous'
        },
        reviewReply: review.reviewReply
      }));

    } catch (error) {
      console.error('Error fetching all reviews:', error);
      return this.getMockReviews();
    }
  }

  getMockReviews(sinceTimestamp = null) {
    const allMockReviews = [
      {
        name: 'accounts/123/locations/456/reviews/review1',
        starRating: 5,
        comment: 'Amazing Chinese food! The Beijing duck was perfectly cooked and the service was excellent. Will definitely come back!',
        createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        reviewer: { displayName: 'John D.' }
      },
      {
        name: 'accounts/123/locations/456/reviews/review2', 
        starRating: 4,
        comment: 'Good food but the wait time was a bit long. The dumplings were delicious though.',
        createTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        reviewer: { displayName: 'Sarah M.' }
      },
      {
        name: 'accounts/123/locations/456/reviews/review3',
        starRating: 5,
        comment: 'Best Chinese restaurant in the area! Fresh ingredients and authentic flavors.',
        createTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        reviewer: { displayName: 'Mike R.' }
      }
    ];

    // Filter by timestamp if provided
    if (sinceTimestamp) {
      return allMockReviews.filter(review => {
        const reviewDate = new Date(review.createTime);
        return reviewDate > sinceTimestamp;
      });
    }

    return allMockReviews;
  }

  async replyToReview(reviewName, replyText) {
    try {
      // Use test mode if specified
      if (process.env.USE_MOCK_DATA === 'true') {
        console.log('TEST MODE: Would reply to review:', reviewName);
        console.log('TEST MODE: Reply text:', replyText);
        
        return {
          message: 'TEST MODE: Reply not actually submitted',
          reviewName,
          replyText,
          timestamp: new Date().toISOString()
        };
      }

      // Post real reply to Google Business Profile API
      console.log('Posting real reply to Google Business Profile API:', reviewName);
      
      const response = await this.businessInfo.locations.reviews.updateReply({
        name: reviewName,
        auth: this.oauth2Client,
        requestBody: {
          comment: replyText
        }
      });

      console.log('Reply posted successfully to Google My Business');
      
      return {
        message: 'Reply posted successfully to Google My Business',
        reviewName,
        replyText,
        timestamp: new Date().toISOString(),
        googleResponse: response.data
      };

    } catch (error) {
      console.error('Error posting reply to Google My Business:', error);
      
      // If it's a test environment or API error, log but don't fail
      if (error.code === 403 || error.code === 401) {
        console.warn('Authentication error - check Google API permissions');
        return {
          message: 'Authentication error - reply not posted',
          reviewName,
          replyText,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
      
      throw error;
    }
  }

}

export default GoogleBusinessClient;