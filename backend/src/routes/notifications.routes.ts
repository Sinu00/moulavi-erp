import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { AuditService } from '../services/auditService';

const router = Router();

// Get notifications for admin/staff (combines status history and audit logs)
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '20', type = 'all' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let notifications: any[] = [];

    if (type === 'all' || type === 'status') {
      // Get recent status changes
      const statusHistory = await prisma.bookingStatusHistory.findMany({
        where: {
          isDeleted: false,
        },
        include: {
          booking: {
            include: {
              service: {
                include: {
                  party: {
                    select: {
                      partyName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
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
        take: type === 'status' ? limitNum : Math.floor(limitNum / 2),
        skip: type === 'status' ? skip : 0,
      });

      // Transform status history to notifications
      const statusNotifications = statusHistory.map((history) => ({
        id: `status_${history.id}`,
        type: 'status_change',
        title: getStatusChangeTitle(history.oldStatus, history.newStatus),
        message: getStatusChangeMessage(history),
        partyName: history.booking.service.party.partyName,
        groupNumber: history.booking.groupNumber,
        changedBy: history.user.name,
        changedAt: history.changedAt,
        bookingId: history.bookingId,
        priority: getStatusPriority(history.newStatus),
        icon: getStatusIcon(history.newStatus),
      }));

      notifications.push(...statusNotifications);
    }

    if (type === 'all' || type === 'audit') {
      // Get recent audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: {
            in: ['booking', 'passenger', 'document', 'user', 'party'],
          },
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
        take: type === 'audit' ? limitNum : Math.floor(limitNum / 2),
        skip: type === 'audit' ? skip : 0,
      });

      // Transform audit logs to notifications
      const auditNotifications = auditLogs.map((log) => ({
        id: `audit_${log.id}`,
        type: 'audit_log',
        title: getAuditTitle(log),
        message: getAuditMessage(log),
        changedBy: log.user.name,
        changedAt: log.changedAt,
        entityType: log.entityType,
        action: log.action,
        priority: getAuditPriority(log.action),
        icon: getAuditIcon(log.action),
      }));

      notifications.push(...auditNotifications);
    }

    // Sort all notifications by date and limit
    notifications.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
    notifications = notifications.slice(0, limitNum);

    // Get unread count
    const unreadCount = await getUnreadNotificationCount(req.user!.id);

    res.json({
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: notifications.length,
        totalPages: Math.ceil(notifications.length / limitNum),
      },
      unreadCount,
    });
  })
);

// Mark notifications as read
router.post(
  '/mark-read',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { notificationIds } = req.body;
    
    // For now, we'll just return success since we're not tracking read status
    // In a real implementation, you'd store read status in a separate table
    
    res.json({ success: true, message: 'Notifications marked as read' });
  })
);

// Get notification statistics
router.get(
  '/stats',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [todayStatusChanges, todayAuditLogs, totalBookings, pendingBookings] = await Promise.all([
      prisma.bookingStatusHistory.count({
        where: {
          changedAt: {
            gte: today,
          },
          isDeleted: false,
        },
      }),
      prisma.auditLog.count({
        where: {
          changedAt: {
            gte: today,
          },
        },
      }),
      prisma.umrahVisaBooking.count(),
      prisma.umrahVisaBooking.count({
        where: {
          status: {
            in: ['group_processing', 'group_assigned'],
          },
        },
      }),
    ]);

    res.json({
      todayStatusChanges,
      todayAuditLogs,
      totalBookings,
      pendingBookings,
      totalNotifications: todayStatusChanges + todayAuditLogs,
    });
  })
);

// Helper functions
function getStatusChangeTitle(oldStatus: string | null, newStatus: string): string {
  const statusMap: Record<string, string> = {
    group_processing: 'Group Processing',
    group_assigned: 'Group Assigned',
    documents_downloaded: 'Documents Downloaded',
    booking_success: 'Booking Success',
    cancelled: 'Cancelled',
  };

  const oldStatusLabel = oldStatus ? statusMap[oldStatus] || oldStatus : 'New';
  const newStatusLabel = statusMap[newStatus] || newStatus;

  return `Status changed from ${oldStatusLabel} to ${newStatusLabel}`;
}

function getStatusChangeMessage(history: any): string {
  const { booking, user, newStatus, groupNumber } = history;
  const partyName = booking.service.party.partyName;
  
  let message = `${user.name} changed ${partyName}'s booking status to ${newStatus.replace('_', ' ')}`;
  
  if (groupNumber) {
    message += ` (Group: ${groupNumber})`;
  }
  
  return message;
}

function getStatusPriority(status: string): 'low' | 'medium' | 'high' {
  const priorityMap: Record<string, 'low' | 'medium' | 'high'> = {
    group_processing: 'medium',
    group_assigned: 'high',
    documents_downloaded: 'high',
    booking_success: 'high',
    cancelled: 'high',
  };
  
  return priorityMap[status] || 'medium';
}

function getStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    group_processing: 'clock',
    group_assigned: 'users',
    documents_downloaded: 'download',
    booking_success: 'check-circle',
    cancelled: 'x-circle',
  };
  
  return iconMap[status] || 'bell';
}

function getAuditTitle(log: any): string {
  const actionMap: Record<string, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
  };
  
  const entityMap: Record<string, string> = {
    booking: 'Booking',
    passenger: 'Passenger',
    document: 'Document',
    user: 'User',
    party: 'Party',
  };
  
  const action = actionMap[log.action] || log.action;
  const entity = entityMap[log.entityType] || log.entityType;
  
  return `${action} ${entity}`;
}

function getAuditMessage(log: any): string {
  const { user, action, entityType } = log;
  
  return `${user.name} ${action}d a ${entityType}`;
}

function getAuditPriority(action: string): 'low' | 'medium' | 'high' {
  const priorityMap: Record<string, 'low' | 'medium' | 'high'> = {
    create: 'medium',
    update: 'low',
    delete: 'high',
  };
  
  return priorityMap[action] || 'medium';
}

function getAuditIcon(action: string): string {
  const iconMap: Record<string, string> = {
    create: 'plus',
    update: 'edit',
    delete: 'trash',
  };
  
  return iconMap[action] || 'activity';
}

async function getUnreadNotificationCount(userId: string): Promise<number> {
  // For now, return a simple count
  // In a real implementation, you'd track read status
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [statusCount, auditCount] = await Promise.all([
    prisma.bookingStatusHistory.count({
      where: {
        changedAt: {
          gte: today,
        },
        isDeleted: false,
      },
    }),
    prisma.auditLog.count({
      where: {
        changedAt: {
          gte: today,
        },
      },
    }),
  ]);
  
  return statusCount + auditCount;
}

export default router;
