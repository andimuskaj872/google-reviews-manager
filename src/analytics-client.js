import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

class ReviewAnalyticsClient {
  constructor() {
    this.client = null;
    this.transport = null;
    this.serverProcess = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Start the MCP analytics server as a child process
      this.serverProcess = spawn('node', ['src/analytics-mcp-server.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      // Create transport using the server's stdio  
      this.transport = new StdioClientTransport();

      // Create client and connect
      this.client = new Client(
        {
          name: 'google-reviews-manager',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      await this.client.connect(this.transport);
      this.isConnected = true;
      
      console.log('✅ Connected to Analytics MCP Server');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Analytics MCP Server:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.close();
    }
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
    this.isConnected = false;
    console.log('🔌 Disconnected from Analytics MCP Server');
  }

  async ensureConnected() {
    if (!this.isConnected) {
      return await this.connect();
    }
    return true;
  }

  // Track a new review
  async trackReview(review) {
    if (!await this.ensureConnected()) return false;

    try {
      const result = await this.client.callTool({
        name: 'track_review',
        arguments: {
          reviewId: review.name || review.id,
          starRating: review.starRating,
          comment: review.comment || '',
          createTime: review.createTime,
          reviewer: review.reviewer?.displayName || 'Anonymous',
          hasReply: !!review.reviewReply
        }
      });

      console.log('📊 Review tracked:', result.content[0].text);
      return true;
    } catch (error) {
      console.error('❌ Failed to track review:', error.message);
      return false;
    }
  }

  // Track a response to a review
  async trackResponse(reviewId, responseText, isAiGenerated = false) {
    if (!await this.ensureConnected()) return false;

    try {
      const result = await this.client.callTool({
        name: 'track_response',
        arguments: {
          reviewId,
          responseTime: new Date().toISOString(),
          responseText,
          isAiGenerated
        }
      });

      console.log('📊 Response tracked:', result.content[0].text);
      return true;
    } catch (error) {
      console.error('❌ Failed to track response:', error.message);
      return false;
    }
  }

  // Analyze sentiment of text
  async analyzeSentiment(text, timestamp = null) {
    if (!await this.ensureConnected()) return null;

    try {
      const result = await this.client.callTool({
        name: 'analyze_sentiment',
        arguments: {
          text,
          timestamp: timestamp || new Date().toISOString()
        }
      });

      return JSON.parse(result.content[0].text);
    } catch (error) {
      console.error('❌ Failed to analyze sentiment:', error.message);
      return null;
    }
  }

  // Get AI-powered insights
  async getInsights(timeframe = 'week', metric = 'all') {
    if (!await this.ensureConnected()) return null;

    try {
      const result = await this.client.callTool({
        name: 'get_insights',
        arguments: { timeframe, metric }
      });

      return result.content[0].text;
    } catch (error) {
      console.error('❌ Failed to get insights:', error.message);
      return null;
    }
  }

  // Get sentiment trends data
  async getSentimentTrends() {
    if (!await this.ensureConnected()) return null;

    try {
      const result = await this.client.readResource({
        uri: 'analytics://sentiment-trends'
      });

      return JSON.parse(result.contents[0].text);
    } catch (error) {
      console.error('❌ Failed to get sentiment trends:', error.message);
      return null;
    }
  }

  // Get response metrics
  async getResponseMetrics() {
    if (!await this.ensureConnected()) return null;

    try {
      const result = await this.client.readResource({
        uri: 'analytics://response-metrics'
      });

      return JSON.parse(result.contents[0].text);
    } catch (error) {
      console.error('❌ Failed to get response metrics:', error.message);
      return null;
    }
  }

  // Get rating distribution
  async getRatingDistribution() {
    if (!await this.ensureConnected()) return null;

    try {
      const result = await this.client.readResource({
        uri: 'analytics://rating-distribution'
      });

      return JSON.parse(result.contents[0].text);
    } catch (error) {
      console.error('❌ Failed to get rating distribution:', error.message);
      return null;
    }
  }

  // Get daily summary
  async getDailySummary() {
    if (!await this.ensureConnected()) return null;

    try {
      const result = await this.client.readResource({
        uri: 'analytics://daily-summary'
      });

      return JSON.parse(result.contents[0].text);
    } catch (error) {
      console.error('❌ Failed to get daily summary:', error.message);
      return null;
    }
  }

  // Track multiple reviews at once (bulk operation)
  async trackReviews(reviews) {
    if (!Array.isArray(reviews)) return false;

    const results = await Promise.allSettled(
      reviews.map(review => this.trackReview(review))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`📊 Bulk tracking completed: ${successful}/${reviews.length} reviews tracked`);
    
    return successful === reviews.length;
  }

  // Get comprehensive analytics report
  async getAnalyticsReport() {
    if (!await this.ensureConnected()) return null;

    try {
      const [insights, sentimentTrends, responseMetrics, ratingDistribution, dailySummary] = await Promise.all([
        this.getInsights(),
        this.getSentimentTrends(),
        this.getResponseMetrics(), 
        this.getRatingDistribution(),
        this.getDailySummary()
      ]);

      return {
        insights,
        sentimentTrends,
        responseMetrics,
        ratingDistribution,
        dailySummary,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to generate analytics report:', error.message);
      return null;
    }
  }
}

export default ReviewAnalyticsClient;