const RiderModel = require('../models/riderModel');
const AssignmentModel = require('../models/assignmentModel');
const OrderModel = require('../models/orderModel');

class DispatchService {

  /**
   * DISPATCH ALGORITHM
   * 
   * Assign order to best available rider based on:
   * 1. Distance (closest first) - 50% weight
   * 2. Rating (higher rating) - 25% weight
   * 3. Experience (more deliveries) - 15% weight
   * 4. Availability - 10% weight
   */
  static async assignOrder(orderId) {
    try {
      // Get order details
      const order = await OrderModel.getById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'pending') {
        throw new Error(`Order already ${order.status}`);
      }

      // Get nearby riders within 5km radius
      const riders = await RiderModel.getNearbyRiders(
        order.pickup_lat,
        order.pickup_lng,
        5 // 5km radius
      );

      if (riders.length === 0) {
        throw new Error('No riders available nearby');
      }

      console.log(`Found ${riders.length} nearby riders for order ${orderId}`);

      // Calculate scores for each rider
      const scoredRiders = riders.map(rider => {
        const score = this.calculateRiderScore(rider);
        return { ...rider, final_score: score };
      });

      // Sort by score descending
      scoredRiders.sort((a, b) => b.final_score - a.final_score);

      // Pick top rider
      const selectedRider = scoredRiders[0];

      console.log(`Selected rider ${selectedRider.name} with score ${selectedRider.final_score}`);

      // Create assignment
      const assignment = await AssignmentModel.create(
        orderId,
        selectedRider.id,
        selectedRider.final_score
      );

      // Update order status
      await OrderModel.updateStatus(orderId, 'assigned');

      // Update rider availability
      await RiderModel.updateAvailability(selectedRider.id, false);

      return {
        assignment,
        rider: selectedRider,
        allCandidates: scoredRiders // For debugging/analytics
      };
    } catch (error) {
      console.error('Error in assignOrder:', error);
      throw error;
    }
  }

  /**
   * Calculate rider score using weighted formula
   * 
   * Weights (configurable via .env):
   * - Distance: 50% (most important)
   * - Rating: 25%
   * - Experience: 15%
   * - Availability: 10%
   */
  static calculateRiderScore(rider) {
    // Distance score: normalize using 1/(1+distance)
    // Closer = higher score (0 km = 1.0, 5 km ≈ 0.17)
    const distanceScore = 1 / (1 + rider.distance_km);

    // Rating score: normalize to 0-1 (assuming ratings are 0-5)
    const ratingScore = (rider.rating_avg || 0) / 5;

    // Experience score: logarithmic scale
    // log(deliveries+1) / log(1000) caps at 1.0 for 1000 deliveries
    const experienceScore = Math.min(
      1.0,
      Math.log(rider.total_deliveries + 1) / Math.log(1000)
    );

    // Availability score: simple binary (already filtered for available)
    const availabilityScore = 1;

    // Get weights from environment or use defaults
    const weights = {
      distance: parseFloat(process.env.WEIGHT_DISTANCE) || 0.5,
      rating: parseFloat(process.env.WEIGHT_RATING) || 0.25,
      experience: parseFloat(process.env.WEIGHT_EXPERIENCE) || 0.15,
      availability: parseFloat(process.env.WEIGHT_AVAILABILITY) || 0.1
    };

    // Weighted sum
    const finalScore = 
      weights.distance * distanceScore +
      weights.rating * ratingScore +
      weights.experience * experienceScore +
      weights.availability * availabilityScore;

    return parseFloat(finalScore.toFixed(4));
  }

  /**
   * Get candidate riders with scores (preview/debugging)
   */
  static async getCandidates(orderId) {
    try {
      const order = await OrderModel.getById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const riders = await RiderModel.getNearbyRiders(
        order.pickup_lat,
        order.pickup_lng,
        5
      );

      if (riders.length === 0) {
        return [];
      }

      const scoredRiders = riders.map(rider => {
        const score = this.calculateRiderScore(rider);
        return { 
          ...rider, 
          final_score: score,
          score_breakdown: {
            distance_km: rider.distance_km,
            distance_score: parseFloat((1 / (1 + rider.distance_km)).toFixed(4)),
            rating: rider.rating_avg,
            rating_score: parseFloat((rider.rating_avg / 5).toFixed(4)),
            total_deliveries: rider.total_deliveries,
            experience_score: parseFloat(Math.min(1.0, Math.log(rider.total_deliveries + 1) / Math.log(1000)).toFixed(4))
          }
        };
      });

      scoredRiders.sort((a, b) => b.final_score - a.final_score);
      
      return scoredRiders;
    } catch (error) {
      console.error('Error in getCandidates:', error);
      throw error;
    }
  }

  /**
   * Reassign order if rider rejects or cancels
   */
  static async reassignOrder(orderId) {
    try {
      // Update order back to pending
      await OrderModel.updateStatus(orderId, 'pending');
      
      // Assign again
      return await this.assignOrder(orderId);
    } catch (error) {
      console.error('Error in reassignOrder:', error);
      throw error;
    }
  }
}

module.exports = DispatchService;