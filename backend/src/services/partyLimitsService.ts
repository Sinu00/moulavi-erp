import { prisma } from '../config/database';

export interface PartyLimitsData {
  partyId: string;
  maxPassengers: number;
  maxPassengersIqama: number;
  maxTravelDays: number;
}

export interface PartyLimitsResult {
  limits: PartyLimitsData | null;
  isValid: boolean;
  message?: string;
}

export class PartyLimitsService {
  /**
   * Get party limits
   */
  static async getPartyLimits(partyId: string): Promise<PartyLimitsResult> {
    try {
      const limits = await prisma.partyLimits.findUnique({
        where: { partyId },
        select: {
          id: true,
          partyId: true,
          maxPassengers: true,
          maxPassengersIqama: true,
          maxTravelDays: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!limits) {
        // Return default limits if not set
        return {
          limits: {
            partyId,
            maxPassengers: 50,
            maxPassengersIqama: 5,
            maxTravelDays: 80
          },
          isValid: true,
          message: 'Using default limits'
        };
      }

      return {
        limits: {
          partyId: limits.partyId,
          maxPassengers: limits.maxPassengers,
          maxPassengersIqama: limits.maxPassengersIqama,
          maxTravelDays: limits.maxTravelDays
        },
        isValid: true
      };
    } catch (error) {
      console.error('Error getting party limits:', error);
      return {
        limits: null,
        isValid: false,
        message: 'Error retrieving party limits'
      };
    }
  }

  /**
   * Create or update party limits
   */
  static async setPartyLimits(data: PartyLimitsData): Promise<PartyLimitsResult> {
    try {
      // Validate limits
      if (data.maxPassengers < 1 || data.maxPassengers > 100) {
        return {
          limits: null,
          isValid: false,
          message: 'Max passengers must be between 1 and 100'
        };
      }

      if (data.maxPassengersIqama < 1 || data.maxPassengersIqama > 10) {
        return {
          limits: null,
          isValid: false,
          message: 'Max passengers for Iqama must be between 1 and 10'
        };
      }

      if (data.maxTravelDays < 1 || data.maxTravelDays > 365) {
        return {
          limits: null,
          isValid: false,
          message: 'Max travel days must be between 1 and 365'
        };
      }

      // Check if party exists
      const party = await prisma.party.findUnique({
        where: { id: data.partyId },
        select: { id: true }
      });

      if (!party) {
        return {
          limits: null,
          isValid: false,
          message: 'Party not found'
        };
      }

      // Upsert party limits
      const limits = await prisma.partyLimits.upsert({
        where: { partyId: data.partyId },
        update: {
          maxPassengers: data.maxPassengers,
          maxPassengersIqama: data.maxPassengersIqama,
          maxTravelDays: data.maxTravelDays,
          updatedAt: new Date()
        },
        create: {
          partyId: data.partyId,
          maxPassengers: data.maxPassengers,
          maxPassengersIqama: data.maxPassengersIqama,
          maxTravelDays: data.maxTravelDays
        }
      });

      return {
        limits: {
          partyId: limits.partyId,
          maxPassengers: limits.maxPassengers,
          maxPassengersIqama: limits.maxPassengersIqama,
          maxTravelDays: limits.maxTravelDays
        },
        isValid: true
      };
    } catch (error) {
      console.error('Error setting party limits:', error);
      return {
        limits: null,
        isValid: false,
        message: 'Error setting party limits'
      };
    }
  }

  /**
   * Validate passenger count against party limits
   */
  static async validatePassengerCount(
    partyId: string,
    passengerCount: number,
    accommodationType: 'hotel' | 'iqama'
  ): Promise<{ isValid: boolean; message?: string; limit?: number }> {
    try {
      const limitsResult = await this.getPartyLimits(partyId);
      
      if (!limitsResult.isValid || !limitsResult.limits) {
        return {
          isValid: false,
          message: limitsResult.message || 'Error validating passenger count'
        };
      }

      const { limits } = limitsResult;
      const maxPassengers = accommodationType === 'iqama' 
        ? limits.maxPassengersIqama 
        : limits.maxPassengers;

      if (passengerCount > maxPassengers) {
        return {
          isValid: false,
          message: `Passenger count ${passengerCount} exceeds limit of ${maxPassengers} for ${accommodationType} accommodation`,
          limit: maxPassengers
        };
      }

      return {
        isValid: true
      };
    } catch (error) {
      console.error('Error validating passenger count:', error);
      return {
        isValid: false,
        message: 'Error validating passenger count'
      };
    }
  }

  /**
   * Validate travel duration against party limits
   */
  static async validateTravelDuration(
    partyId: string,
    arrivalDate: Date,
    departureDate: Date
  ): Promise<{ isValid: boolean; message?: string; limit?: number; actualDays?: number }> {
    try {
      const limitsResult = await this.getPartyLimits(partyId);
      
      if (!limitsResult.isValid || !limitsResult.limits) {
        return {
          isValid: false,
          message: limitsResult.message || 'Error validating travel duration'
        };
      }

      const { limits } = limitsResult;
      const diffTime = departureDate.getTime() - arrivalDate.getTime();
      const actualDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (actualDays > limits.maxTravelDays) {
        return {
          isValid: false,
          message: `Travel duration ${actualDays} days exceeds limit of ${limits.maxTravelDays} days`,
          limit: limits.maxTravelDays,
          actualDays
        };
      }

      return {
        isValid: true,
        actualDays
      };
    } catch (error) {
      console.error('Error validating travel duration:', error);
      return {
        isValid: false,
        message: 'Error validating travel duration'
      };
    }
  }

  /**
   * Get all party limits with pagination
   */
  static async getAllPartyLimits(
    page: number = 1,
    limit: number = 50,
    search?: string
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.party = {
        OR: [
          { partyName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    try {
      const [limits, total] = await Promise.all([
        prisma.partyLimits.findMany({
          where,
          include: {
            party: {
              select: {
                id: true,
                partyName: true,
                email: true,
                customerType: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: {
            updatedAt: 'desc'
          }
        }),
        prisma.partyLimits.count({ where })
      ]);

      return {
        limits,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting all party limits:', error);
      throw error;
    }
  }

  /**
   * Delete party limits
   */
  static async deletePartyLimits(partyId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const limits = await prisma.partyLimits.findUnique({
        where: { partyId },
        select: { id: true }
      });

      if (!limits) {
        return {
          success: false,
          message: 'Party limits not found'
        };
      }

      await prisma.partyLimits.delete({
        where: { partyId }
      });

      return {
        success: true,
        message: 'Party limits deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting party limits:', error);
      return {
        success: false,
        message: 'Error deleting party limits'
      };
    }
  }

  /**
   * Get party limits statistics
   */
  static async getPartyLimitsStatistics() {
    try {
      const [
        totalParties,
        partiesWithLimits,
        averageMaxPassengers,
        averageMaxPassengersIqama,
        averageMaxTravelDays
      ] = await Promise.all([
        prisma.party.count(),
        prisma.partyLimits.count(),
        prisma.partyLimits.aggregate({
          _avg: { maxPassengers: true }
        }),
        prisma.partyLimits.aggregate({
          _avg: { maxPassengersIqama: true }
        }),
        prisma.partyLimits.aggregate({
          _avg: { maxTravelDays: true }
        })
      ]);

      return {
        totalParties,
        partiesWithLimits,
        partiesWithoutLimits: totalParties - partiesWithLimits,
        averageMaxPassengers: Number(averageMaxPassengers._avg.maxPassengers || 0),
        averageMaxPassengersIqama: Number(averageMaxPassengersIqama._avg.maxPassengersIqama || 0),
        averageMaxTravelDays: Number(averageMaxTravelDays._avg.maxTravelDays || 0)
      };
    } catch (error) {
      console.error('Error getting party limits statistics:', error);
      throw error;
    }
  }

  /**
   * Bulk update party limits
   */
  static async bulkUpdatePartyLimits(
    updates: Array<{
      partyId: string;
      maxPassengers?: number;
      maxPassengersIqama?: number;
      maxTravelDays?: number;
    }>
  ) {
    try {
      const results = await Promise.all(
        updates.map(async (update) => {
          const { partyId, ...limitData } = update;
          
          // Get current limits
          const currentLimits = await this.getPartyLimits(partyId);
          if (!currentLimits.isValid || !currentLimits.limits) {
            return {
              partyId,
              success: false,
              message: currentLimits.message || 'Error getting current limits'
            };
          }

          // Merge with current limits
          const newLimits = {
            ...currentLimits.limits,
            ...limitData
          };

          // Set new limits
          const result = await this.setPartyLimits(newLimits);
          
          return {
            partyId,
            success: result.isValid,
            message: result.message,
            limits: result.limits
          };
        })
      );

      return results;
    } catch (error) {
      console.error('Error bulk updating party limits:', error);
      throw error;
    }
  }
}
