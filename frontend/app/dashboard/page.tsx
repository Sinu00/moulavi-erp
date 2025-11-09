'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { partyAPI, umrahVisaAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import NotificationDropdown from '@/components/NotificationDropdown';
import { Users, FileText, TrendingUp, Activity, Menu } from 'lucide-react';
import CreatePartyDialog from '@/components/CreatePartyDialog';
import PartyList from '@/components/PartyList';
import { DashboardStats } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const user = getUser();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalParties: 0,
    totalServices: 0, // Keep for backward compatibility, but will be totalBookings
    pendingServices: 0, // Keep for backward compatibility, but will be pendingBookings
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }

    loadStats();
  }, [user, router]);

  const loadStats = async () => {
    try {
      const [partiesRes, bookingsRes, pendingBookingsRes] = await Promise.all([
        partyAPI.getAll({ limit: 1 }),
        umrahVisaAPI.getBookings({ limit: 1 }),
        umrahVisaAPI.getBookings({ 
          status: ['pending', 'documents_downloaded', 'group_assigned'],
          limit: 1 
        }),
      ]);

      setStats({
        totalParties: partiesRes.data.pagination.total,
        totalServices: bookingsRes.data.pagination.total, // Total bookings
        pendingServices: pendingBookingsRes.data.pagination.total, // Pending bookings
      });
    } catch (error) {
      // Error handling is done by the API interceptor
      setStats({
        totalParties: 0,
        totalServices: 0,
        pendingServices: 0,
      });
    }
  };

  const handlePartyCreated = () => {
    setRefreshKey(prev => prev + 1);
    loadStats();
    setShowCreateDialog(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header Bar */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Welcome back, {user.name}!
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Notifications - Only for admin/staff */}
              {hasRole(['admin', 'staff']) && (
                <NotificationDropdown />
              )}
              
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Parties</CardTitle>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalParties}</div>
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  Registered clients
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Bookings</CardTitle>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalServices}</div>
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <Activity className="h-3 w-3 mr-1 text-green-500" />
                  All bookings
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pending Bookings</CardTitle>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.pendingServices}</div>
                <p className="text-xs text-gray-500 mt-1">Awaiting processing</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalServices - stats.pendingServices}</div>
                <p className="text-xs text-gray-500 mt-1">Successfully processed</p>
              </CardContent>
            </Card>
          </div>

          {/* Party List Table */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Parties</CardTitle>
                <div className="text-xs text-gray-500">
                  Total: {stats.totalParties} clients
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PartyList key={refreshKey} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Party Dialog */}
      <CreatePartyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={async (partyData) => {
          try {
            await partyAPI.create(partyData);
            handlePartyCreated();
          } catch (error) {
            throw error; // Re-throw to let the dialog handle the error display
          }
        }}
      />
    </div>
  );
}

