'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Clock, 
  Users, 
  Download, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Edit, 
  Trash, 
  Activity,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '@/lib/api';

interface Notification {
  id: string;
  type: 'status_change' | 'audit_log';
  title: string;
  message: string;
  partyName?: string;
  groupNumber?: string;
  changedBy: string;
  changedAt: string;
  bookingId?: string;
  priority: 'low' | 'medium' | 'high';
  icon: string;
  entityType?: string;
  action?: string;
}

interface NotificationStats {
  todayStatusChanges: number;
  todayAuditLogs: number;
  totalBookings: number;
  pendingBookings: number;
  totalNotifications: number;
}

interface NotificationDropdownProps {
  className?: string;
}

export default function NotificationDropdown({ className }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      loadStats();
    }
  }, [isOpen]);

  // Auto-refresh notifications every 30 seconds when open
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      loadNotifications();
      loadStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications?limit=10');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/notifications/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load notification stats:', error);
    }
  };

  const markAsRead = async () => {
    try {
      await api.post('/notifications/mark-read', {
        notificationIds: notifications.map(n => n.id)
      });
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      clock: Clock,
      users: Users,
      download: Download,
      'check-circle': CheckCircle,
      'x-circle': XCircle,
      plus: Plus,
      edit: Edit,
      trash: Trash,
      activity: Activity,
      bell: Bell,
    };
    
    const IconComponent = iconMap[iconName] || Bell;
    return <IconComponent className="h-4 w-4" />;
  };

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      high: 'bg-red-100 text-red-800 border-red-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-green-100 text-green-800 border-green-300',
    };
    
    return colorMap[priority] || colorMap.medium;
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Notifications</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAsRead}
                disabled={unreadCount === 0}
              >
                Mark all read
              </Button>
            </div>
            
            {stats && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-sm font-medium text-blue-600">
                    {stats.todayStatusChanges}
                  </div>
                  <div className="text-xs text-blue-500">Status Changes</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="text-sm font-medium text-green-600">
                    {stats.pendingBookings}
                  </div>
                  <div className="text-xs text-green-500">Pending Bookings</div>
                </div>
              </div>
            )}
          </div>

          <ScrollArea className="h-96">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <Card className="mb-2 hover:bg-gray-50 cursor-pointer">
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getIcon(notification.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </h4>
                              <Badge 
                                className={`text-xs ${getPriorityColor(notification.priority)}`}
                              >
                                {notification.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            {notification.groupNumber && (
                              <p className="text-xs text-blue-600 mt-1">
                                Group: {notification.groupNumber}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">
                                by {notification.changedBy}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatTime(notification.changedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {index < notifications.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                // Navigate to full notifications page
                window.location.href = '/dashboard/notifications';
              }}
            >
              View All Notifications
            </Button>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
