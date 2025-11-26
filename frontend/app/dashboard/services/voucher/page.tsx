'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Menu, 
  Search, 
  RefreshCw,
  Eye,
  Edit,
  Ticket,
  Calendar,
  Users,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { getUser, hasRole } from '@/lib/auth';
import { voucherAPI } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewVoucherDialog } from '@/components/voucher/ViewVoucherDialog';
import { EditVoucherDialog } from '@/components/voucher/EditVoucherDialog';
import { UpdateMovementDialog } from '@/components/voucher/UpdateMovementDialog';
import { QuickVoucherForm } from '@/components/voucher/QuickVoucherForm';

interface Voucher {
  id: string;
  voucherNumber: string;
  reservationDate: string;
  guestName: string;
  guestMobile?: string;
  groupCode?: string;
  paxCount: number;
  createdAt: string;
  generatedByUser: {
    id: string;
    name: string;
    email: string;
  };
  booking: {
    id: string;
    party: {
      id: string;
      partyName: string;
      email: string;
      contactNumber?: string;
      whatsappNumber?: string;
    };
  };
}

interface Movement {
  voucherId: string;
  voucherNumber: string;
  movementIndex: number;
  routeNumber: string;
  date: string;
  time: string;
  agentName: string;
  guestName: string;
  mobile: string;
  pax: number;
  fromLocation: string;
  toLocation: string;
  driverDetails1: string;
  driverDetails2: string;
  vehicleNumber: string;
  partyEmail: string;
  partyWhatsApp: string;
}

interface Stats {
  totalVouchers: number;
  todayMovements: number;
  tomorrowMovements: number;
}

export default function VoucherServicePage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'quick' | 'today' | 'tomorrow'>('all');
  
  // Stats
  const [stats, setStats] = useState<Stats>({
    totalVouchers: 0,
    todayMovements: 0,
    tomorrowMovements: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  // All Vouchers
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  // Movements
  const [todayMovements, setTodayMovements] = useState<Movement[]>([]);
  const [tomorrowMovements, setTomorrowMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updateMovementDialogOpen, setUpdateMovementDialogOpen] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const response = await voucherAPI.getVoucherStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadVouchers = async () => {
    try {
      setLoadingVouchers(true);
      const response = await voucherAPI.getAllVouchers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
      });
      setVouchers(response.data.vouchers);
      // Only update if pagination values actually changed
      const newPagination = response.data.pagination;
      setPagination(prev => {
        // Compare values to avoid unnecessary updates
        if (prev.page === newPagination.page && 
            prev.total === newPagination.total && 
            prev.totalPages === newPagination.totalPages &&
            prev.limit === newPagination.limit) {
          return prev; // Return same reference to prevent re-render
        }
        return newPagination;
      });
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast.error('Failed to load vouchers');
    } finally {
      setLoadingVouchers(false);
    }
  };

  const loadTodayMovements = async () => {
    try {
      setLoadingMovements(true);
      const response = await voucherAPI.getTodayMovements();
      setTodayMovements(response.data.movements);
    } catch (error) {
      console.error('Error loading today movements:', error);
      toast.error('Failed to load today movements');
    } finally {
      setLoadingMovements(false);
    }
  };

  const loadTomorrowMovements = async () => {
    try {
      setLoadingMovements(true);
      const response = await voucherAPI.getTomorrowMovements();
      setTomorrowMovements(response.data.movements);
    } catch (error) {
      console.error('Error loading tomorrow movements:', error);
      toast.error('Failed to load tomorrow movements');
    } finally {
      setLoadingMovements(false);
    }
  };

  // Load stats on mount
  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load vouchers when search term or page changes (only for 'all' tab)
  useEffect(() => {
    if (activeTab === 'all') {
      loadVouchers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, pagination.page, activeTab]);

  // Load movements when tab changes
  useEffect(() => {
    if (activeTab === 'today') {
      loadTodayMovements();
    } else if (activeTab === 'tomorrow') {
      loadTomorrowMovements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  const filteredVouchers = vouchers.filter(voucher => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      voucher.voucherNumber.toLowerCase().includes(term) ||
      voucher.guestName.toLowerCase().includes(term) ||
      voucher.guestMobile?.toLowerCase().includes(term) ||
      voucher.groupCode?.toLowerCase().includes(term)
    );
  });

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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Voucher Management</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage vouchers and movement details
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadStats();
                  if (activeTab === 'all') loadVouchers();
                  else if (activeTab === 'today') loadTodayMovements();
                  else if (activeTab === 'tomorrow') loadTomorrowMovements();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Vouchers</CardTitle>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold text-gray-900">{stats.totalVouchers}</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Today Movements</CardTitle>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold text-gray-900">{stats.todayMovements}</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tomorrow Movements</CardTitle>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold text-gray-900">{stats.tomorrowMovements}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Card>
            <CardContent className="pt-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'all'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    All Vouchers
                  </button>
                  <button
                    onClick={() => setActiveTab('quick')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'quick'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Quick Voucher
                  </button>
                  <button
                    onClick={() => setActiveTab('today')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'today'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Today Movement
                  </button>
                  <button
                    onClick={() => setActiveTab('tomorrow')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'tomorrow'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Tomorrow Movement
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-6">
                {activeTab === 'all' && (
                  <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        placeholder="Search by voucher number, guest name, mobile, or group code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Table */}
                    {loadingVouchers ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : filteredVouchers.length === 0 ? (
                      <div className="text-center py-12">
                        <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No vouchers found</h3>
                        <p className="text-gray-500">
                          {searchTerm ? 'Try adjusting your search criteria.' : 'No vouchers have been created yet.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Reservation Number</TableHead>
                                <TableHead>Group Number</TableHead>
                                <TableHead>Guest Name</TableHead>
                                <TableHead>Guest Number</TableHead>
                                <TableHead>No of Passengers</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Created Date</TableHead>
                                <TableHead>Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredVouchers.map((voucher) => (
                                <TableRow key={voucher.id}>
                                  <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                                  <TableCell>{voucher.groupCode || 'N/A'}</TableCell>
                                  <TableCell>{voucher.guestName}</TableCell>
                                  <TableCell>{voucher.guestMobile || 'N/A'}</TableCell>
                                  <TableCell>{voucher.paxCount}</TableCell>
                                  <TableCell>{voucher.generatedByUser.name}</TableCell>
                                  <TableCell>
                                    {new Date(voucher.createdAt).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedVoucherId(voucher.id);
                                          setViewDialogOpen(true);
                                        }}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedVoucherId(voucher.id);
                                          setEditDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                              {pagination.total} results
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                disabled={pagination.page === 1 || loadingVouchers}
                              >
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                disabled={pagination.page === pagination.totalPages || loadingVouchers}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'quick' && (
                  <QuickVoucherForm
                    onSuccess={() => {
                      loadStats();
                      loadVouchers();
                      setActiveTab('all');
                    }}
                  />
                )}

                {activeTab === 'today' && (
                  <div className="space-y-4">
                    {loadingMovements ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : todayMovements.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No movements for today</h3>
                        <p className="text-gray-500">No movements scheduled for today.</p>
                      </div>
                    ) : (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Route Number</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Agent Name</TableHead>
                              <TableHead>Guest Name</TableHead>
                              <TableHead>Mobile</TableHead>
                              <TableHead>Pax</TableHead>
                              <TableHead>From Location</TableHead>
                              <TableHead>To Location</TableHead>
                              <TableHead>Driver Details 1</TableHead>
                              <TableHead>Driver Details 2</TableHead>
                              <TableHead>Vehicle Number</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {todayMovements.map((movement, idx) => (
                              <TableRow key={`${movement.voucherId}-${movement.movementIndex}`}>
                                <TableCell>{movement.routeNumber}</TableCell>
                                <TableCell>{movement.date}</TableCell>
                                <TableCell>{movement.time}</TableCell>
                                <TableCell>{movement.agentName}</TableCell>
                                <TableCell>{movement.guestName}</TableCell>
                                <TableCell>{movement.mobile}</TableCell>
                                <TableCell>{movement.pax}</TableCell>
                                <TableCell>{movement.fromLocation}</TableCell>
                                <TableCell>{movement.toLocation}</TableCell>
                                <TableCell>{movement.driverDetails1 || 'N/A'}</TableCell>
                                <TableCell>{movement.driverDetails2 || 'N/A'}</TableCell>
                                <TableCell>{movement.vehicleNumber || 'N/A'}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMovement(movement);
                                      setUpdateMovementDialogOpen(true);
                                    }}
                                  >
                                    Update
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'tomorrow' && (
                  <div className="space-y-4">
                    {loadingMovements ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : tomorrowMovements.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No movements for tomorrow</h3>
                        <p className="text-gray-500">No movements scheduled for tomorrow.</p>
                      </div>
                    ) : (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Route Number</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Agent Name</TableHead>
                              <TableHead>Guest Name</TableHead>
                              <TableHead>Mobile</TableHead>
                              <TableHead>Pax</TableHead>
                              <TableHead>From Location</TableHead>
                              <TableHead>To Location</TableHead>
                              <TableHead>Driver Details 1</TableHead>
                              <TableHead>Driver Details 2</TableHead>
                              <TableHead>Vehicle Number</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tomorrowMovements.map((movement, idx) => (
                              <TableRow key={`${movement.voucherId}-${movement.movementIndex}`}>
                                <TableCell>{movement.routeNumber}</TableCell>
                                <TableCell>{movement.date}</TableCell>
                                <TableCell>{movement.time}</TableCell>
                                <TableCell>{movement.agentName}</TableCell>
                                <TableCell>{movement.guestName}</TableCell>
                                <TableCell>{movement.mobile}</TableCell>
                                <TableCell>{movement.pax}</TableCell>
                                <TableCell>{movement.fromLocation}</TableCell>
                                <TableCell>{movement.toLocation}</TableCell>
                                <TableCell>{movement.driverDetails1 || 'N/A'}</TableCell>
                                <TableCell>{movement.driverDetails2 || 'N/A'}</TableCell>
                                <TableCell>{movement.vehicleNumber || 'N/A'}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMovement(movement);
                                      setUpdateMovementDialogOpen(true);
                                    }}
                                  >
                                    Update
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <ViewVoucherDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        voucherId={selectedVoucherId}
      />
      
      <EditVoucherDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        voucherId={selectedVoucherId}
        onSuccess={() => {
          loadVouchers();
          loadStats();
        }}
      />
      
      <UpdateMovementDialog
        open={updateMovementDialogOpen}
        onOpenChange={setUpdateMovementDialogOpen}
        movement={selectedMovement}
        onSuccess={() => {
          if (activeTab === 'today') {
            loadTodayMovements();
          } else if (activeTab === 'tomorrow') {
            loadTomorrowMovements();
          }
          loadStats();
        }}
      />
    </div>
  );
}

