import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { AuditService } from '../services/auditService';
import { prisma } from '../config/database';

const router = Router();

// Get audit trail for a specific entity
router.get(
  '/trail/:entityType/:entityId',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { entityType, entityId } = req.params;
    
    const auditTrail = await AuditService.getAuditTrail(entityType, entityId);
    
    res.json({
      auditTrail,
      entityType,
      entityId,
    });
  })
);

// Get status history for a booking
router.get(
  '/status-history/:bookingId',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.params;
    
    const statusHistory = await AuditService.getStatusHistory(bookingId);
    
    res.json({
      statusHistory,
      bookingId,
    });
  })
);

// Get audit logs with pagination and filters
router.get(
  '/logs',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { 
      page = '1', 
      limit = '50',
      entityType,
      action,
      changedBy,
      dateFrom,
      dateTo
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    const filters: any = {};
    
    if (entityType) filters.entityType = entityType as string;
    if (action) filters.action = action as string;
    if (changedBy) filters.changedBy = changedBy as string;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);
    
    const result = await AuditService.getAuditLogs(pageNum, limitNum, filters);
    
    res.json(result);
  })
);

// Get audit statistics
router.get(
  '/stats',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { dateFrom, dateTo } = req.query;
    
    const where: any = {};
    
    if (dateFrom || dateTo) {
      where.changedAt = {};
      if (dateFrom) {
        where.changedAt.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.changedAt.lte = new Date(dateTo as string);
      }
    }
    
    const [
      totalLogs,
      createLogs,
      updateLogs,
      deleteLogs,
      bookingLogs,
      passengerLogs,
      documentLogs
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { ...where, action: 'create' } }),
      prisma.auditLog.count({ where: { ...where, action: 'update' } }),
      prisma.auditLog.count({ where: { ...where, action: 'delete' } }),
      prisma.auditLog.count({ where: { ...where, entityType: 'booking' } }),
      prisma.auditLog.count({ where: { ...where, entityType: 'passenger' } }),
      prisma.auditLog.count({ where: { ...where, entityType: 'document' } })
    ]);
    
    res.json({
      stats: {
        totalLogs,
        actionBreakdown: {
          create: createLogs,
          update: updateLogs,
          delete: deleteLogs
        },
        entityBreakdown: {
          booking: bookingLogs,
          passenger: passengerLogs,
          document: documentLogs
        }
      }
    });
  })
);

export default router;
