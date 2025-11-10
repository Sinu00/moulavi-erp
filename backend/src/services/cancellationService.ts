import { prisma } from '../config/database';

export interface CancellationPolicyData {
  name: string;
  daysBeforeTravel: number;
  cancellationFee: number;
  refundPercentage: number;
}

export interface CancellationCalculation {
  canCancel: boolean;
  cancellationFee: number;
  refundAmount: number;
  refundPercentage: number;
  policy: CancellationPolicyData | null;
  message?: string;
}

export interface BookingCancellationData {
  bookingId: string;
  cancellationReason: string;
  cancelledBy: string;
  cancellationDate: Date;
  refundAmount?: number;
  cancellationFee?: number;
}

export class CancellationService {
  /**
   * Get applicable cancellation policy for a booking
   */
  static async getCancellationPolicy(
    arrivalDate: Date,
    cancellationDate: Date = new Date()
  ): Promise<CancellationPolicyData | null> {
    try {
      const daysBeforeTravel = Math.ceil(
        (arrivalDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const policy = await prisma.cancellationPolicy.findFirst({
        where: {
          isActive: true,
          daysBeforeTravel: {
            lte: daysBeforeTravel
          }
        },
        orderBy: {
          daysBeforeTravel: 'desc'
        }
      });

      if (!policy) {
        return null;
      }

      return {
        name: policy.name,
        daysBeforeTravel: policy.daysBeforeTravel,
        cancellationFee: Number(policy.cancellationFee),
        refundPercentage: Number(policy.refundPercentage)
      };
    } catch (error) {
      console.error('Error getting cancellation policy:', error);
      return null;
    }
  }

  /**
   * Calculate cancellation details for a booking
   */
  static async calculateCancellation(
    bookingId: string,
    cancellationDate: Date = new Date()
  ): Promise<CancellationCalculation> {
    try {
      // Get booking details with related data
      const booking = await prisma.umrahVisaBooking.findUnique({
        where: { id: bookingId },
        include: {
          travelDetails: {
            select: {
              arrivalDateTime: true
            }
          },
          transportBookings: {
            include: {
              transportMaster: {
            select: {
              price: true
                }
              }
            }
          }
        }
      });

      if (!booking) {
        return {
          canCancel: false,
          cancellationFee: 0,
          refundAmount: 0,
          refundPercentage: 0,
          policy: null,
          message: 'Booking not found'
        };
      }

      if (booking.isDeleted) {
        return {
          canCancel: false,
          cancellationFee: 0,
          refundAmount: 0,
          refundPercentage: 0,
          policy: null,
          message: 'Booking already cancelled'
        };
      }

      if (booking.status === 'cancelled') {
        return {
          canCancel: false,
          cancellationFee: 0,
          refundAmount: 0,
          refundPercentage: 0,
          policy: null,
          message: 'Booking already cancelled'
        };
      }

      // Get applicable policy
      const arrivalDate = booking.travelDetails?.arrivalDateTime;
      if (!arrivalDate) {
        return {
          canCancel: false,
          cancellationFee: 0,
          refundAmount: 0,
          refundPercentage: 0,
          policy: null,
          message: 'No travel details found for booking'
        };
      }
      
      const policy = await this.getCancellationPolicy(arrivalDate, cancellationDate);

      if (!policy) {
        return {
          canCancel: false,
          cancellationFee: 0,
          refundAmount: 0,
          refundPercentage: 0,
          policy: null,
          message: 'No cancellation policy applicable'
        };
      }

      // Calculate refund from transport bookings
      const totalTransportCost = booking.transportBookings?.reduce((sum: number, transport: any) => {
        return sum + Number(transport.transportMaster?.price || 0);
      }, 0) || 0;
      const totalCost = totalTransportCost;
      const cancellationFee = policy.cancellationFee;
      const refundPercentage = policy.refundPercentage;
      const refundAmount = (totalCost - cancellationFee) * (refundPercentage / 100);

      return {
        canCancel: true,
        cancellationFee,
        refundAmount: Math.max(0, refundAmount),
        refundPercentage,
        policy,
        message: `Cancellation allowed with ${refundPercentage}% refund`
      };
    } catch (error) {
      console.error('Error calculating cancellation:', error);
      return {
        canCancel: false,
        cancellationFee: 0,
        refundAmount: 0,
        refundPercentage: 0,
        policy: null,
        message: 'Error calculating cancellation'
      };
    }
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(data: BookingCancellationData): Promise<{ success: boolean; message?: string }> {
    try {
      const { bookingId, cancellationReason, cancelledBy, cancellationDate, refundAmount, cancellationFee } = data;

      // Calculate cancellation details
      const cancellationDetails = await this.calculateCancellation(bookingId, cancellationDate);

      if (!cancellationDetails.canCancel) {
        return {
          success: false,
          message: cancellationDetails.message || 'Booking cannot be cancelled'
        };
      }

      // Update booking status
      await prisma.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      });

      // Log status change
      await prisma.bookingStatusHistory.create({
        data: {
          bookingId,
          oldStatus: 'pending', // This should be fetched from current status
          newStatus: 'cancelled',
          changedBy: cancelledBy,
          reason: `Cancelled: ${cancellationReason}`
        }
      });

      // Log audit trail
      await prisma.auditLog.create({
        data: {
          entityType: 'booking',
          entityId: bookingId,
          action: 'update',
          oldValues: { status: 'pending' },
          newValues: { 
            status: 'cancelled',
            cancellationReason,
            refundAmount: refundAmount || cancellationDetails.refundAmount,
            cancellationFee: cancellationFee || cancellationDetails.cancellationFee
          },
          changedBy: cancelledBy
        }
      });

      return {
        success: true,
        message: 'Booking cancelled successfully'
      };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return {
        success: false,
        message: 'Error cancelling booking'
      };
    }
  }

  /**
   * Create cancellation policy
   */
  static async createCancellationPolicy(data: CancellationPolicyData): Promise<{ success: boolean; message?: string }> {
    try {
      await prisma.cancellationPolicy.create({
        data: {
          name: data.name,
          daysBeforeTravel: data.daysBeforeTravel,
          cancellationFee: data.cancellationFee,
          refundPercentage: data.refundPercentage,
          isActive: true
        }
      });

      return {
        success: true,
        message: 'Cancellation policy created successfully'
      };
    } catch (error) {
      console.error('Error creating cancellation policy:', error);
      return {
        success: false,
        message: 'Error creating cancellation policy'
      };
    }
  }

  /**
   * Get all cancellation policies
   */
  static async getAllCancellationPolicies(includeInactive: boolean = false) {
    try {
      const where: any = {};
      
      if (!includeInactive) {
        where.isActive = true;
      }

      const policies = await prisma.cancellationPolicy.findMany({
        where,
        orderBy: {
          daysBeforeTravel: 'desc'
        }
      });

      return policies.map(policy => ({
        id: policy.id,
        name: policy.name,
        daysBeforeTravel: policy.daysBeforeTravel,
        cancellationFee: Number(policy.cancellationFee),
        refundPercentage: Number(policy.refundPercentage),
        isActive: policy.isActive,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt
      }));
    } catch (error) {
      console.error('Error getting cancellation policies:', error);
      throw error;
    }
  }

  /**
   * Update cancellation policy
   */
  static async updateCancellationPolicy(
    policyId: string,
    data: Partial<CancellationPolicyData>
  ): Promise<{ success: boolean; message?: string }> {
    try {
      await prisma.cancellationPolicy.update({
        where: { id: policyId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Cancellation policy updated successfully'
      };
    } catch (error) {
      console.error('Error updating cancellation policy:', error);
      return {
        success: false,
        message: 'Error updating cancellation policy'
      };
    }
  }

  /**
   * Deactivate cancellation policy
   */
  static async deactivateCancellationPolicy(policyId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await prisma.cancellationPolicy.update({
        where: { id: policyId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Cancellation policy deactivated successfully'
      };
    } catch (error) {
      console.error('Error deactivating cancellation policy:', error);
      return {
        success: false,
        message: 'Error deactivating cancellation policy'
      };
    }
  }

  /**
   * Get cancellation statistics
   */
  static async getCancellationStatistics() {
    try {
      const [
        totalBookings,
        cancelledBookings,
        totalPolicies,
        activePolicies
      ] = await Promise.all([
        prisma.umrahVisaBooking.count({
          where: { isDeleted: false }
        }),
        prisma.umrahVisaBooking.count({
          where: { 
            status: 'cancelled',
            isDeleted: false 
          }
        }),
        prisma.cancellationPolicy.count(),
        prisma.cancellationPolicy.count({
          where: { isActive: true }
        })
      ]);

      const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

      return {
        totalBookings,
        cancelledBookings,
        cancellationRate: Number(cancellationRate.toFixed(2)),
        totalPolicies,
        activePolicies,
        inactivePolicies: totalPolicies - activePolicies
      };
    } catch (error) {
      console.error('Error getting cancellation statistics:', error);
      throw error;
    }
  }

  /**
   * Get booking cancellation history
   */
  static async getBookingCancellationHistory(bookingId: string) {
    try {
      const statusHistory = await prisma.bookingStatusHistory.findMany({
        where: {
          bookingId,
          newStatus: 'cancelled'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          changedAt: 'desc'
        }
      });

      return statusHistory;
    } catch (error) {
      console.error('Error getting booking cancellation history:', error);
      throw error;
    }
  }

  /**
   * Validate cancellation request
   */
  static async validateCancellationRequest(
    bookingId: string,
    cancellationDate: Date = new Date()
  ): Promise<{ isValid: boolean; message?: string; details?: CancellationCalculation }> {
    try {
      const details = await this.calculateCancellation(bookingId, cancellationDate);

      if (!details.canCancel) {
        return {
          isValid: false,
          message: details.message || 'Booking cannot be cancelled',
          details
        };
      }

      return {
        isValid: true,
        message: 'Cancellation request is valid',
        details
      };
    } catch (error) {
      console.error('Error validating cancellation request:', error);
      return {
        isValid: false,
        message: 'Error validating cancellation request'
      };
    }
  }
}
