import redisClient from '../../config/redis';

export class QuotaService {
  private static readonly MAX_FREE_ADS_PER_MONTH = 2;

  /**
   * Check if user can post a free ad for the given monthYear (e.g., '2026-09')
   * Returns true if allowed, false otherwise.
   */
  static async canPostFreeAd(userId: string, monthYear: string): Promise<boolean> {
    const key = `quota:${monthYear}:${userId}`;
    const currentCountStr = await redisClient.get(key);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

    return currentCount < this.MAX_FREE_ADS_PER_MONTH;
  }

  /**
   * Increment the user's monthly free ad quota counter.
   */
  static async incrementFreeAdQuota(userId: string, monthYear: string): Promise<void> {
    const key = `quota:${monthYear}:${userId}`;
    const newCount = await redisClient.incr(key);

    // If it's the first ad of the month, set expiry to 32 days to ensure it covers the month
    if (newCount === 1) {
      await redisClient.expire(key, 32 * 24 * 60 * 60);
    }
  }
}
