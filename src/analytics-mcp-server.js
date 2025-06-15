import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class ReviewAnalyticsMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'google-reviews-analytics',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // In-memory analytics store (in production, use a real database)
    this.analyticsData = {
      reviews: [],
      metrics: {
        totalReviews: 0,
        averageRating: 0,
        sentimentTrends: [],
        responseRate: 0,
        responseTimeAvg: 0
      },
      dailyStats: new Map(),
      sentimentHistory: []
    };

    this.setupHandlers();
  }

  setupHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'analytics://sentiment-trends',
          mimeType: 'application/json',
          name: 'Sentiment Trends',
          description: 'Historical sentiment analysis of reviews'
        },
        {
          uri: 'analytics://response-metrics',
          mimeType: 'application/json', 
          name: 'Response Metrics',
          description: 'Response rate and time analytics'
        },
        {
          uri: 'analytics://rating-distribution',
          mimeType: 'application/json',
          name: 'Rating Distribution', 
          description: 'Distribution of star ratings over time'
        },
        {
          uri: 'analytics://daily-summary',
          mimeType: 'application/json',
          name: 'Daily Summary',
          description: 'Daily review and response summary'
        }
      ]
    }));

    // Read resource data
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'analytics://sentiment-trends':
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.getSentimentTrends(), null, 2)
            }]
          };

        case 'analytics://response-metrics':
          return {
            contents: [{
              uri,
              mimeType: 'application/json', 
              text: JSON.stringify(this.getResponseMetrics(), null, 2)
            }]
          };

        case 'analytics://rating-distribution':
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.getRatingDistribution(), null, 2)
            }]
          };

        case 'analytics://daily-summary':
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.getDailySummary(), null, 2)
            }]
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'track_review',
          description: 'Track a new review for analytics',
          inputSchema: {
            type: 'object',
            properties: {
              reviewId: { type: 'string' },
              starRating: { type: 'number', minimum: 1, maximum: 5 },
              comment: { type: 'string' },
              createTime: { type: 'string' },
              reviewer: { type: 'string' },
              hasReply: { type: 'boolean' }
            },
            required: ['reviewId', 'starRating', 'createTime']
          }
        },
        {
          name: 'track_response',
          description: 'Track a response to a review',
          inputSchema: {
            type: 'object',
            properties: {
              reviewId: { type: 'string' },
              responseTime: { type: 'string' },
              responseText: { type: 'string' },
              isAiGenerated: { type: 'boolean' }
            },
            required: ['reviewId', 'responseTime']
          }
        },
        {
          name: 'analyze_sentiment',
          description: 'Analyze sentiment of review text',
          inputSchema: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              timestamp: { type: 'string' }
            },
            required: ['text']
          }
        },
        {
          name: 'get_insights',
          description: 'Get AI-powered insights from analytics data',
          inputSchema: {
            type: 'object',
            properties: {
              timeframe: { type: 'string', enum: ['week', 'month', 'quarter'] },
              metric: { type: 'string', enum: ['sentiment', 'ratings', 'responses', 'all'] }
            }
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'track_review':
          return { content: [{ type: 'text', text: this.trackReview(args) }] };

        case 'track_response':
          return { content: [{ type: 'text', text: this.trackResponse(args) }] };

        case 'analyze_sentiment':
          return { content: [{ type: 'text', text: JSON.stringify(this.analyzeSentiment(args), null, 2) }] };

        case 'get_insights':
          return { content: [{ type: 'text', text: this.getInsights(args) }] };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  // Analytics methods
  trackReview({ reviewId, starRating, comment, createTime, reviewer, hasReply }) {
    const review = {
      id: reviewId,
      starRating,
      comment: comment || '',
      createTime: new Date(createTime),
      reviewer: reviewer || 'Anonymous',
      hasReply: hasReply || false,
      sentiment: this.calculateSentiment(comment || ''),
      trackedAt: new Date()
    };

    this.analyticsData.reviews.push(review);
    this.updateMetrics();
    this.updateDailyStats(review);

    return `Review ${reviewId} tracked successfully. Sentiment: ${review.sentiment.label} (${review.sentiment.score.toFixed(2)})`;
  }

  trackResponse({ reviewId, responseTime, responseText, isAiGenerated }) {
    const review = this.analyticsData.reviews.find(r => r.id === reviewId);
    if (!review) {
      return `Review ${reviewId} not found`;
    }

    const responseTimeMs = new Date(responseTime) - review.createTime;
    review.responseTime = responseTimeMs;
    review.responseText = responseText;
    review.isAiGenerated = isAiGenerated || false;
    review.hasReply = true;

    this.updateMetrics();
    return `Response tracked for review ${reviewId}. Response time: ${Math.round(responseTimeMs / (1000 * 60 * 60))} hours`;
  }

  analyzeSentiment({ text, timestamp }) {
    const sentiment = this.calculateSentiment(text);
    
    if (timestamp) {
      this.analyticsData.sentimentHistory.push({
        timestamp: new Date(timestamp),
        sentiment,
        text: text.substring(0, 100) + '...'
      });
    }

    return sentiment;
  }

  calculateSentiment(text) {
    // Simple sentiment analysis (in production, use a proper NLP library)
    const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'outstanding', 'delicious', 'best'];
    const negativeWords = ['terrible', 'awful', 'bad', 'horrible', 'worst', 'hate', 'disgusting', 'poor', 'disappointing', 'slow'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) {
      return { label: 'neutral', score: 0, confidence: 0.5 };
    }

    const score = (positiveCount - negativeCount) / totalSentimentWords;
    const label = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
    const confidence = Math.min(1, Math.abs(score) + 0.5);

    return { label, score, confidence, positiveCount, negativeCount };
  }

  updateMetrics() {
    const reviews = this.analyticsData.reviews;
    this.analyticsData.metrics.totalReviews = reviews.length;
    
    if (reviews.length > 0) {
      this.analyticsData.metrics.averageRating = 
        reviews.reduce((sum, r) => sum + r.starRating, 0) / reviews.length;
        
      const reviewsWithReplies = reviews.filter(r => r.hasReply);
      this.analyticsData.metrics.responseRate = reviewsWithReplies.length / reviews.length;
      
      if (reviewsWithReplies.length > 0) {
        this.analyticsData.metrics.responseTimeAvg = 
          reviewsWithReplies.reduce((sum, r) => sum + (r.responseTime || 0), 0) / reviewsWithReplies.length;
      }
    }
  }

  updateDailyStats(review) {
    const dateKey = review.createTime.toISOString().split('T')[0];
    
    if (!this.analyticsData.dailyStats.has(dateKey)) {
      this.analyticsData.dailyStats.set(dateKey, {
        date: dateKey,
        reviewCount: 0,
        averageRating: 0,
        sentimentCounts: { positive: 0, negative: 0, neutral: 0 },
        responseCount: 0
      });
    }
    
    const dayStats = this.analyticsData.dailyStats.get(dateKey);
    dayStats.reviewCount++;
    dayStats.sentimentCounts[review.sentiment.label]++;
    
    // Recalculate average rating for the day
    const dayReviews = this.analyticsData.reviews.filter(r => 
      r.createTime.toISOString().split('T')[0] === dateKey
    );
    dayStats.averageRating = dayReviews.reduce((sum, r) => sum + r.starRating, 0) / dayReviews.length;
  }

  getSentimentTrends() {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last30Days.map(date => {
      const dayStats = this.analyticsData.dailyStats.get(date);
      return {
        date,
        sentiment: dayStats ? dayStats.sentimentCounts : { positive: 0, negative: 0, neutral: 0 },
        reviewCount: dayStats ? dayStats.reviewCount : 0
      };
    });
  }

  getResponseMetrics() {
    return {
      responseRate: this.analyticsData.metrics.responseRate,
      averageResponseTime: this.analyticsData.metrics.responseTimeAvg,
      averageResponseTimeHours: Math.round(this.analyticsData.metrics.responseTimeAvg / (1000 * 60 * 60)),
      totalResponses: this.analyticsData.reviews.filter(r => r.hasReply).length,
      aiGeneratedResponses: this.analyticsData.reviews.filter(r => r.isAiGenerated).length
    };
  }

  getRatingDistribution() {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    this.analyticsData.reviews.forEach(review => {
      distribution[review.starRating]++;
    });
    
    return {
      distribution,
      totalReviews: this.analyticsData.metrics.totalReviews,
      averageRating: this.analyticsData.metrics.averageRating
    };
  }

  getDailySummary() {
    return Array.from(this.analyticsData.dailyStats.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 7); // Last 7 days
  }

  getInsights({ timeframe = 'week', metric = 'all' }) {
    const insights = [];
    
    // Generate insights based on the data
    if (this.analyticsData.metrics.totalReviews === 0) {
      return 'No reviews data available for insights.';
    }

    insights.push(`📈 Total Reviews: ${this.analyticsData.metrics.totalReviews}`);
    insights.push(`⭐ Average Rating: ${this.analyticsData.metrics.averageRating.toFixed(1)}/5`);
    insights.push(`💬 Response Rate: ${(this.analyticsData.metrics.responseRate * 100).toFixed(1)}%`);
    
    if (this.analyticsData.metrics.responseTimeAvg > 0) {
      const avgHours = Math.round(this.analyticsData.metrics.responseTimeAvg / (1000 * 60 * 60));
      insights.push(`⏱️ Average Response Time: ${avgHours} hours`);
    }

    // Sentiment insights
    const sentimentCounts = this.analyticsData.reviews.reduce((acc, r) => {
      acc[r.sentiment.label] = (acc[r.sentiment.label] || 0) + 1;
      return acc;
    }, {});
    
    const dominantSentiment = Object.entries(sentimentCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (dominantSentiment) {
      insights.push(`😊 Dominant Sentiment: ${dominantSentiment[0]} (${dominantSentiment[1]} reviews)`);
    }

    return insights.join('\n');
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Reviews Analytics MCP Server running on stdio');
  }
}

// Run the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new ReviewAnalyticsMCPServer();
  server.run().catch(console.error);
}

export default ReviewAnalyticsMCPServer;