// Simple analytics implementation without MCP for immediate testing
class SimpleAnalytics {
  constructor() {
    this.data = {
      reviews: [],
      responses: [],
      metrics: {
        totalReviews: 0,
        averageRating: 0,
        responseRate: 0,
        sentimentCounts: { positive: 0, negative: 0, neutral: 0 }
      }
    };
  }

  // Track a review
  async trackReview(review) {
    try {
      const sentiment = this.calculateSentiment(review.comment || '');
      const analyticsRecord = {
        id: review.name || review.id,
        starRating: review.starRating,
        comment: review.comment || '',
        createTime: new Date(review.createTime),
        reviewer: review.reviewer?.displayName || 'Anonymous',
        hasReply: !!review.reviewReply,
        sentiment,
        trackedAt: new Date()
      };

      this.data.reviews.push(analyticsRecord);
      this.updateMetrics();
      
      console.log(`📊 Review tracked: ${review.starRating}⭐ ${sentiment.label} sentiment`);
      return true;
    } catch (error) {
      console.error('❌ Failed to track review:', error.message);
      return false;
    }
  }

  // Track multiple reviews
  async trackReviews(reviews) {
    if (!Array.isArray(reviews)) return false;
    
    let successful = 0;
    for (const review of reviews) {
      if (await this.trackReview(review)) {
        successful++;
      }
    }
    
    console.log(`📊 Bulk tracking: ${successful}/${reviews.length} reviews tracked`);
    return successful === reviews.length;
  }

  // Track a response
  async trackResponse(reviewId, responseText, isAiGenerated = false) {
    try {
      const response = {
        reviewId,
        responseText,
        isAiGenerated,
        timestamp: new Date()
      };

      this.data.responses.push(response);
      
      // Update the review record
      const review = this.data.reviews.find(r => r.id === reviewId);
      if (review) {
        review.hasReply = true;
        review.responseTime = response.timestamp - review.createTime;
        review.isAiGenerated = isAiGenerated;
      }

      this.updateMetrics();
      console.log(`📊 Response tracked: ${isAiGenerated ? 'AI-generated' : 'Manual'} reply`);
      return true;
    } catch (error) {
      console.error('❌ Failed to track response:', error.message);
      return false;
    }
  }

  // Calculate simple sentiment
  calculateSentiment(text) {
    const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'outstanding', 'delicious', 'best', 'awesome', 'good'];
    const negativeWords = ['terrible', 'awful', 'bad', 'horrible', 'worst', 'hate', 'disgusting', 'poor', 'disappointing', 'slow', 'rude', 'dirty'];
    
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

    return { label, score: score.toFixed(2), confidence: confidence.toFixed(2), positiveCount, negativeCount };
  }

  // Update metrics
  updateMetrics() {
    const reviews = this.data.reviews;
    this.data.metrics.totalReviews = reviews.length;
    
    if (reviews.length > 0) {
      // Average rating
      this.data.metrics.averageRating = 
        (reviews.reduce((sum, r) => sum + r.starRating, 0) / reviews.length).toFixed(1);
        
      // Response rate
      const reviewsWithReplies = reviews.filter(r => r.hasReply);
      this.data.metrics.responseRate = 
        ((reviewsWithReplies.length / reviews.length) * 100).toFixed(1);
      
      // Sentiment counts
      this.data.metrics.sentimentCounts = reviews.reduce((acc, r) => {
        acc[r.sentiment.label]++;
        return acc;
      }, { positive: 0, negative: 0, neutral: 0 });
    }
  }

  // Get insights
  async getInsights() {
    const metrics = this.data.metrics;
    const insights = [];
    
    if (metrics.totalReviews === 0) {
      return 'No reviews data available for insights.';
    }

    insights.push(`📈 Total Reviews: ${metrics.totalReviews}`);
    insights.push(`⭐ Average Rating: ${metrics.averageRating}/5`);
    insights.push(`💬 Response Rate: ${metrics.responseRate}%`);
    
    // AI vs Manual responses
    const aiResponses = this.data.responses.filter(r => r.isAiGenerated).length;
    const manualResponses = this.data.responses.length - aiResponses;
    if (this.data.responses.length > 0) {
      insights.push(`🤖 AI Responses: ${aiResponses}, Manual: ${manualResponses}`);
    }

    // Sentiment breakdown
    const sentiment = metrics.sentimentCounts;
    insights.push(`😊 Sentiment: ${sentiment.positive} positive, ${sentiment.neutral} neutral, ${sentiment.negative} negative`);

    return insights.join('\n');
  }

  // Get full analytics report
  async getAnalyticsReport() {
    return {
      insights: await this.getInsights(),
      metrics: this.data.metrics,
      recentReviews: this.data.reviews.slice(-5).map(r => ({
        starRating: r.starRating,
        sentiment: r.sentiment.label,
        hasReply: r.hasReply,
        createTime: r.createTime,
        comment: r.comment.substring(0, 100) + '...'
      })),
      responseBreakdown: {
        total: this.data.responses.length,
        aiGenerated: this.data.responses.filter(r => r.isAiGenerated).length,
        manual: this.data.responses.filter(r => !r.isAiGenerated).length
      },
      generatedAt: new Date().toISOString()
    };
  }

  // Placeholder methods for compatibility
  async connect() { return true; }
  async disconnect() { return true; }
  async getSentimentTrends() { return this.data.reviews.map(r => r.sentiment); }
  async getResponseMetrics() { return this.data.metrics; }
  async getRatingDistribution() { 
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    this.data.reviews.forEach(r => dist[r.starRating]++);
    return { distribution: dist, total: this.data.reviews.length };
  }
  async getDailySummary() { return this.data.metrics; }
}

export default SimpleAnalytics;