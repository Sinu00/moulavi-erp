import { prisma } from '../config/database';

export interface TransportPricingRequest {
  fromLocationId?: string;
  toLocationId?: string;
  routeId?: string; // Keep for backward compatibility
  transportType: string;
  paxCount: number;
  date?: Date;
}

export interface TransportPricingResult {
  price: number | null;
  isValid: boolean;
  pricingId?: string;
  validFrom?: Date;
  validTo?: Date;
  message?: string;
}

export interface TransportOption {
  type: string;
  paxOptions: number[];
  pricePerPax: { [pax: number]: number };
  isAvailable: boolean;
}

export class TransportPricingService {
  /**
   * Get transport price for specific configuration
   */
  static async getTransportPrice(request: TransportPricingRequest): Promise<TransportPricingResult> {
    const { fromLocationId, toLocationId, routeId, transportType, paxCount } = request;

    try {
      // Build where clause based on available parameters
      const whereClause: any = {
        vehicleType: transportType,
        pax: paxCount,
        isActive: true
      };

      if (fromLocationId && toLocationId) {
        whereClause.fromLocationId = fromLocationId;
        whereClause.toLocationId = toLocationId;
      }

      // Use TransportMaster instead of TransportPricing
      const transport = await prisma.transportMaster.findFirst({
        where: whereClause
      });

      if (!transport) {
        const routeInfo = fromLocationId && toLocationId ? `from ${fromLocationId} to ${toLocationId}` : `route ${routeId}`;
        return {
          price: null,
          isValid: false,
          message: `No transport found for ${transportType} with ${paxCount} PAX on ${routeInfo}`
        };
      }

      return {
        price: Number(transport.price),
        isValid: true,
        pricingId: transport.id,
        validFrom: transport.createdAt,
        validTo: undefined
      };
    } catch (error) {
      console.error('Error getting transport price:', error);
      return {
        price: null,
        isValid: false,
        message: 'Error retrieving transport pricing'
      };
    }
  }

  /**
   * Get all available transport options for a route
   */
  static async getTransportOptions(fromLocationId?: string, toLocationId?: string, date?: Date): Promise<TransportOption[]> {
    try {
      const whereClause: any = {
        isActive: true
      };

      if (fromLocationId && toLocationId) {
        whereClause.fromLocationId = fromLocationId;
        whereClause.toLocationId = toLocationId;
      }

      const transportOptions = await prisma.transportMaster.findMany({
        where: whereClause,
        orderBy: [
          { vehicleType: 'asc' },
          { paxCount: 'asc' }
        ]
      });

      // Group by transport type
      const groupedOptions: { [key: string]: TransportOption } = {};

      for (const transport of transportOptions) {
        if (!groupedOptions[transport.vehicleType]) {
          groupedOptions[transport.vehicleType] = {
            type: transport.vehicleType,
            paxOptions: [],
            pricePerPax: {},
            isAvailable: true
          };
        }

        groupedOptions[transport.vehicleType].paxOptions.push(transport.paxCount);
        groupedOptions[transport.vehicleType].pricePerPax[transport.paxCount] = Number(transport.price);
      }

      return Object.values(groupedOptions);
    } catch (error) {
      console.error('Error getting transport options:', error);
      return [];
    }
  }

  /**
   * Create or update transport pricing
   */
  static async createTransportPricing(data: {
    routeId: string;
    transportType: string;
    paxCount: number;
    price: number;
    validFrom: Date;
    validTo?: Date;
  }) {
    try {
      // Check if pricing already exists for the same configuration
      const existingPricing = await prisma.transportPricing.findFirst({
        where: {
          routeId: data.routeId,
          transportType: data.transportType,
          paxCount: data.paxCount,
          isActive: true,
          OR: [
            {
              validFrom: {
                lte: data.validTo || new Date()
              },
              validTo: {
                gte: data.validFrom
              }
            },
            {
              validFrom: {
                lte: data.validTo || new Date()
              },
              validTo: null
            }
          ]
        }
      });

      if (existingPricing) {
        // Update existing pricing
        return await prisma.transportPricing.update({
          where: { id: existingPricing.id },
          data: {
            price: data.price,
            validFrom: data.validFrom,
            validTo: data.validTo,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new pricing
        return await prisma.transportPricing.create({
          data: {
            routeId: data.routeId,
            transportType: data.transportType,
            paxCount: data.paxCount,
            price: data.price,
            validFrom: data.validFrom,
            validTo: data.validTo,
            isActive: true
          }
        });
      }
    } catch (error) {
      console.error('Error creating transport pricing:', error);
      throw error;
    }
  }

  /**
   * Bulk create transport pricing
   */
  static async bulkCreateTransportPricing(pricingData: Array<{
    routeId: string;
    transportType: string;
    paxCount: number;
    price: number;
    validFrom: Date;
    validTo?: Date;
  }>) {
    try {
      const results = await Promise.all(
        pricingData.map(data => this.createTransportPricing(data))
      );

      return results;
    } catch (error) {
      console.error('Error bulk creating transport pricing:', error);
      throw error;
    }
  }

  /**
   * Deactivate transport pricing
   */
  static async deactivateTransportPricing(pricingId: string) {
    try {
      return await prisma.transportPricing.update({
        where: { id: pricingId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error deactivating transport pricing:', error);
      throw error;
    }
  }

  /**
   * Get transport pricing history
   */
  static async getTransportPricingHistory(
    routeId?: string,
    transportType?: string,
    page: number = 1,
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (routeId) {
      where.routeId = routeId;
    }
    
    if (transportType) {
      where.transportType = transportType;
    }

    try {
      const [pricingHistory, total] = await Promise.all([
        prisma.transportPricing.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { routeId: 'asc' },
            { transportType: 'asc' },
            { paxCount: 'asc' },
            { validFrom: 'desc' }
          ]
        }),
        prisma.transportPricing.count({ where })
      ]);

      return {
        pricingHistory,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting transport pricing history:', error);
      throw error;
    }
  }

  /**
   * Calculate total transport cost for multiple bookings
   */
  static async calculateTotalTransportCost(
    bookings: Array<{
      fromLocationId?: string;
      toLocationId?: string;
      routeId?: string;
      transportType: string;
      paxCount: number;
      date: Date;
    }>
  ) {
    try {
      const totalCost = await Promise.all(
        bookings.map(async (booking) => {
          const pricing = await this.getTransportPrice({
            fromLocationId: booking.fromLocationId,
            toLocationId: booking.toLocationId,
            routeId: booking.routeId,
            transportType: booking.transportType,
            paxCount: booking.paxCount,
            date: booking.date
          });

          return {
            booking,
            cost: pricing.price || 0,
            isValid: pricing.isValid
          };
        })
      );

      const total = totalCost.reduce((sum, item) => sum + item.cost, 0);
      const invalidBookings = totalCost.filter(item => !item.isValid);

      return {
        totalCost: total,
        breakdown: totalCost,
        invalidBookings,
        hasInvalidBookings: invalidBookings.length > 0
      };
    } catch (error) {
      console.error('Error calculating total transport cost:', error);
      throw error;
    }
  }

  /**
   * Get pricing statistics
   */
  static async getPricingStatistics() {
    try {
      const [
        totalPricing,
        activePricing,
        routesCount,
        transportTypesCount,
        averagePrice
      ] = await Promise.all([
        prisma.transportPricing.count(),
        prisma.transportPricing.count({ where: { isActive: true } }),
        prisma.transportPricing.groupBy({
          by: ['routeId'],
          _count: { routeId: true }
        }),
        prisma.transportPricing.groupBy({
          by: ['transportType'],
          _count: { transportType: true }
        }),
        prisma.transportPricing.aggregate({
          _avg: { price: true }
        })
      ]);

      return {
        totalPricing,
        activePricing,
        inactivePricing: totalPricing - activePricing,
        routesCount: routesCount.length,
        transportTypesCount: transportTypesCount.length,
        averagePrice: Number(averagePrice._avg.price || 0)
      };
    } catch (error) {
      console.error('Error getting pricing statistics:', error);
      throw error;
    }
  }

  /**
   * Validate transport configuration
   */
  static async validateTransportConfiguration(
    fromLocationId?: string,
    toLocationId?: string,
    transportType?: string,
    paxCount?: number,
    date?: Date,
    routeId?: string // Keep for backward compatibility
  ): Promise<{ isValid: boolean; message?: string; alternatives?: TransportOption[] }> {
    const queryDate = date || new Date();

    try {
      // Check if exact configuration exists using TransportMaster
      const whereClause: any = {
        vehicleType: transportType,
        pax: paxCount,
        isActive: true
      };

      if (fromLocationId && toLocationId) {
        whereClause.fromLocationId = fromLocationId;
        whereClause.toLocationId = toLocationId;
      }

      const exactMatch = await prisma.transportMaster.findFirst({
        where: whereClause
      });

      if (exactMatch) {
        return { isValid: true };
      }

      // Get alternatives
      const alternatives = await this.getTransportOptions(fromLocationId, toLocationId, queryDate);
      const availableAlternatives = paxCount ? alternatives.filter(option => 
        option.paxOptions.includes(paxCount) || 
        option.paxOptions.some(pax => Math.abs(pax - paxCount) <= 2)
      ) : alternatives;

      const routeInfo = fromLocationId && toLocationId ? `from ${fromLocationId} to ${toLocationId}` : `route ${routeId}`;
      return {
        isValid: false,
        message: `Transport ${transportType} with ${paxCount} PAX not available for ${routeInfo}`,
        alternatives: availableAlternatives
      };
    } catch (error) {
      console.error('Error validating transport configuration:', error);
      return {
        isValid: false,
        message: 'Error validating transport configuration'
      };
    }
  }
}
