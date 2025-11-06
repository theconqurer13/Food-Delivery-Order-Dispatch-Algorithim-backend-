const cron = require('node-cron');
const FraudService = require('../services/fraudService');
const LocationService = require('../services/locationService');


/**
 * Background job for fraud detection
 * Runs every minute to check for suspicious activity
 */

class FraudJob {
  
  /**
   * Start the cron job
   */
  static start() {
    // Run every minute
    cron.schedule('* * * * *', async () => {
      console.log('🕵️ Running fraud detection job...');
      
      try {
        await this.checkAllActiveRiders();
      } catch (error) {
        console.error('Fraud job error:', error);
      }
    });

    console.log('✅ Fraud detection job started (runs every minute)');
  }

  /**
   * Check all active riders for fraud
   */
  static async checkAllActiveRiders() {
    try {
      // Get all active riders with recent location updates
      const riders = await LocationService.getActiveRidersLocations();

      console.log(`Checking ${riders.length} active riders...`);

      for (const rider of riders) {
        try {
          // Run fraud checks
          await FraudService.runAllChecks(rider.rider_id);
        } catch (error) {
          console.error(`Error checking rider ${rider.rider_id}:`, error);
        }
      }

      console.log(`✅ Fraud checks completed for ${riders.length} riders`);
    } catch (error) {
      console.error('Error in checkAllActiveRiders:', error);
    }
  }

  /**
   * Check specific rider
   */
  static async checkRider(riderId) {
    try {
      console.log(`Checking rider ${riderId} for fraud...`);
      
      const results = await FraudService.runAllChecks(riderId);
      
      if (results.is_suspicious) {
        console.log(`🚨 Suspicious activity detected for rider ${riderId}`);
      } else {
        console.log(`✅ Rider ${riderId} checks passed`);
      }

      return results;
    } catch (error) {
      console.error(`Error checking rider ${riderId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup old location data
   * Run daily to remove locations older than 30 days
   */
  static startCleanupJob() {
    // Run daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Running location cleanup job...');
      
      try {
        const count = await LocationService.cleanupOldLocations(30);
        console.log(`✅ Cleaned up ${count} old location records`);
      } catch (error) {
        console.error('Cleanup job error:', error);
      }
    });

    console.log('✅ Location cleanup job started (runs daily at 2 AM)');
  }
}

module.exports = FraudJob;