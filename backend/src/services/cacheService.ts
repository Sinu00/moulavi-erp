import { prisma } from '../config/database';

// Simple in-memory cache (in production, use Redis)
class MemoryCache {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

const cache = new MemoryCache();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);

export class CacheService {
  /**
   * Cache key generators
   */
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Get cached data
   */
  static get<T>(key: string): T | null {
    return cache.get(key);
  }

  /**
   * Set cached data
   */
  static set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    cache.set(key, data, ttl);
  }

  /**
   * Delete cached data
   */
  static delete(key: string): void {
    cache.delete(key);
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): { size: number; keys: string[] } {
    return cache.getStats();
  }

  /**
   * Cache party data
   */
  static async getCachedParty(partyId: string) {
    const key = this.generateKey('party', partyId);
    let party = this.get(key);

    if (!party) {
      party = await prisma.party.findUnique({
        where: { id: partyId },
        select: {
          id: true,
          partyName: true,
          email: true,
          customerType: true,
          accountCurrency: true
        }
      });

      if (party) {
        this.set(key, party, 10 * 60 * 1000); // 10 minutes
      }
    }

    return party;
  }

  /**
   * Cache transport pricing - REMOVED: TransportPricing table has been removed
   */
  static async getCachedTransportPricing(routeId: string, transportType: string, paxCount: number) {
    // TransportPricing table has been removed
    return null;
  }

  /**
   * Cache cancellation policies
   */
  static async getCachedCancellationPolicies() {
    const key = this.generateKey('cancellation-policies');
    let policies = this.get(key);

    if (!policies) {
      policies = await prisma.cancellationPolicy.findMany({
        where: { isActive: true },
        orderBy: { daysBeforeTravel: 'desc' }
      });

      this.set(key, policies, 60 * 60 * 1000); // 1 hour
    }

    return policies;
  }

  /**
   * Cache booking statistics
   */
  static async getCachedBookingStats(dateFrom?: Date, dateTo?: Date) {
    const key = this.generateKey('booking-stats', 
      dateFrom?.toISOString() || 'all', 
      dateTo?.toISOString() || 'all'
    );
    let stats = this.get(key);

    if (!stats) {
      const where: any = { isDeleted: false };
      
      if (dateFrom || dateTo) {
        where.travelDetails = {
          arrivalDateTime: {}
        };
        if (dateFrom) where.travelDetails.arrivalDateTime.gte = dateFrom;
        if (dateTo) where.travelDetails.arrivalDateTime.lte = dateTo;
      }

      const [
        totalBookings,
        pendingBookings,
        processingBookings,
        approvedBookings,
        completedBookings,
        cancelledBookings
      ] = await Promise.all([
        prisma.umrahVisaBooking.count({ where }),
        prisma.umrahVisaBooking.count({ where: { ...where, status: 'pending' } }),
        prisma.umrahVisaBooking.count({ where: { ...where, status: 'processing' } }),
        prisma.umrahVisaBooking.count({ where: { ...where, status: 'approved' } }),
        prisma.umrahVisaBooking.count({ where: { ...where, status: 'completed' } }),
        prisma.umrahVisaBooking.count({ where: { ...where, status: 'cancelled' } })
      ]);

      stats = {
        totalBookings,
        pendingBookings,
        processingBookings,
        approvedBookings,
        completedBookings,
        cancelledBookings
      };

      this.set(key, stats, 5 * 60 * 1000); // 5 minutes
    }

    return stats;
  }

  /**
   * Invalidate cache for specific patterns
   */
  static invalidatePattern(pattern: string): void {
    const stats = this.getStats();
    const regex = new RegExp(pattern);
    
    stats.keys.forEach(key => {
      if (regex.test(key)) {
        this.delete(key);
      }
    });
  }

  /**
   * Invalidate party-related cache
   */
  static invalidatePartyCache(partyId: string): void {
    this.invalidatePattern(`^party:${partyId}`);
  }

  /**
   * Invalidate transport pricing cache
   */
  static invalidateTransportPricingCache(): void {
    // TransportPricing table has been removed - no-op
    this.invalidatePattern('^transport-pricing:');
  }

  /**
   * Invalidate booking cache
   */
  static invalidateBookingCache(): void {
    this.invalidatePattern('^booking-stats:');
  }

  /**
   * Cache with fallback function
   */
  static async withCache<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    let data = this.get<T>(key);

    if (!data) {
      data = await fallback();
      this.set(key, data, ttl);
    }

    return data;
  }

  /**
   * Cache middleware for Express routes
   */
  static cacheMiddleware(ttl: number = 5 * 60 * 1000) {
    return (req: any, res: any, next: any) => {
      const key = this.generateKey('route', req.method, req.originalUrl, JSON.stringify(req.query));
      
      const cached = this.get(key);
      if (cached) {
        return res.json(cached);
      }

      const originalSend = res.json;
      res.json = function(data: any) {
        CacheService.set(key, data, ttl);
        return originalSend.call(this, data);
      };

      next();
    };
  }
}
