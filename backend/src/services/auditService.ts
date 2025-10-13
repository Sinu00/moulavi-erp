import { prisma } from '../config/database';
import { Request } from 'express';

export interface AuditLogData {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  oldValues?: any;
  newValues?: any;
  changedBy: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface StatusHistoryData {
  bookingId: string;
  oldStatus?: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
}

export class AuditService {
  /**
   * Log an audit trail entry
   */
  static async logAudit(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          oldValues: data.oldValues,
          newValues: data.newValues,
          changedBy: data.changedBy,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log audit trail:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log status change for booking
   */
  static async logStatusChange(data: StatusHistoryData): Promise<void> {
    try {
      await prisma.bookingStatusHistory.create({
        data: {
          bookingId: data.bookingId,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          changedBy: data.changedBy,
          reason: data.reason,
        },
      });
    } catch (error) {
      console.error('Failed to log status change:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Extract request info for audit logging
   */
  static extractRequestInfo(req: Request): { ipAddress?: string; userAgent?: string } {
    return {
      ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
      userAgent: req.get('User-Agent'),
    };
  }

  /**
   * Log booking creation
   */
  static async logBookingCreation(
    bookingId: string,
    userId: string,
    bookingData: any,
    req?: Request
  ): Promise<void> {
    const requestInfo = req ? this.extractRequestInfo(req) : {};
    
    await this.logAudit({
      entityType: 'booking',
      entityId: bookingId,
      action: 'create',
      newValues: bookingData,
      changedBy: userId,
      ...requestInfo,
    });
  }

  /**
   * Log booking update
   */
  static async logBookingUpdate(
    bookingId: string,
    userId: string,
    oldValues: any,
    newValues: any,
    req?: Request
  ): Promise<void> {
    const requestInfo = req ? this.extractRequestInfo(req) : {};
    
    await this.logAudit({
      entityType: 'booking',
      entityId: bookingId,
      action: 'update',
      oldValues,
      newValues,
      changedBy: userId,
      ...requestInfo,
    });
  }

  /**
   * Log booking status change
   */
  static async logBookingStatusChange(
    bookingId: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
    reason?: string,
    req?: Request
  ): Promise<void> {
    // Log status history
    await this.logStatusChange({
      bookingId,
      oldStatus,
      newStatus,
      changedBy: userId,
      reason,
    });

    // Log audit trail
    const requestInfo = req ? this.extractRequestInfo(req) : {};
    await this.logAudit({
      entityType: 'booking',
      entityId: bookingId,
      action: 'update',
      oldValues: { status: oldStatus },
      newValues: { status: newStatus, reason },
      changedBy: userId,
      ...requestInfo,
    });
  }

  /**
   * Log passenger creation
   */
  static async logPassengerCreation(
    passengerId: string,
    userId: string,
    passengerData: any,
    req?: Request
  ): Promise<void> {
    const requestInfo = req ? this.extractRequestInfo(req) : {};
    
    await this.logAudit({
      entityType: 'passenger',
      entityId: passengerId,
      action: 'create',
      newValues: passengerData,
      changedBy: userId,
      ...requestInfo,
    });
  }

  /**
   * Log passenger update
   */
  static async logPassengerUpdate(
    passengerId: string,
    userId: string,
    oldValues: any,
    newValues: any,
    req?: Request
  ): Promise<void> {
    const requestInfo = req ? this.extractRequestInfo(req) : {};
    
    await this.logAudit({
      entityType: 'passenger',
      entityId: passengerId,
      action: 'update',
      oldValues,
      newValues,
      changedBy: userId,
      ...requestInfo,
    });
  }

  /**
   * Log document upload
   */
  static async logDocumentUpload(
    documentId: string,
    userId: string,
    documentData: any,
    req?: Request
  ): Promise<void> {
    const requestInfo = req ? this.extractRequestInfo(req) : {};
    
    await this.logAudit({
      entityType: 'document',
      entityId: documentId,
      action: 'create',
      newValues: documentData,
      changedBy: userId,
      ...requestInfo,
    });
  }

  /**
   * Log document deletion
   */
  static async logDocumentDeletion(
    documentId: string,
    userId: string,
    documentData: any,
    req?: Request
  ): Promise<void> {
    const requestInfo = req ? this.extractRequestInfo(req) : {};
    
    await this.logAudit({
      entityType: 'document',
      entityId: documentId,
      action: 'delete',
      oldValues: documentData,
      changedBy: userId,
      ...requestInfo,
    });
  }

  /**
   * Get audit trail for an entity
   */
  static async getAuditTrail(entityType: string, entityId: string) {
    return await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        changedAt: 'desc',
      },
    });
  }

  /**
   * Get status history for a booking
   */
  static async getStatusHistory(bookingId: string) {
    return await prisma.bookingStatusHistory.findMany({
      where: {
        bookingId,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        changedAt: 'desc',
      },
    });
  }

  /**
   * Get audit logs with pagination
   */
  static async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    filters?: {
      entityType?: string;
      action?: string;
      changedBy?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }
    
    if (filters?.action) {
      where.action = filters.action;
    }
    
    if (filters?.changedBy) {
      where.changedBy = filters.changedBy;
    }
    
    if (filters?.dateFrom || filters?.dateTo) {
      where.changedAt = {};
      if (filters.dateFrom) {
        where.changedAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.changedAt.lte = filters.dateTo;
      }
    }
    
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          changedAt: 'desc',
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    
    return {
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
