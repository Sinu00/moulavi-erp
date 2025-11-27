'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { QuickVoucherForm } from '@/components/voucher/QuickVoucherForm';
import { Loader2, Save } from 'lucide-react';

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
  movementId?: string;
  routeNumber: string;
  date: string;
  time: string;
  agentName: string;
  guestName: string;
  mobile: string;
  pax: number;
  from: string;
  fromLocation: string;
  fromLocationId?: string | null;
  to: string;
  toLocation: string;
  toLocationId?: string | null;
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
  
  // Master Data
  const [cities, setCities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [locationsByCity, setLocationsByCity] = useState<Map<string, any[]>>(new Map());
  
  // Editing states
  const [editingMovements, setEditingMovements] = useState<Map<string, Movement>>(new Map());
  const [savingMovementId, setSavingMovementId] = useState<string | null>(null);


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

  // Update movement field in editing state
  const updateMovementField = (movementId: string, field: string, value: any) => {
    setEditingMovements(prev => {
      const updated = new Map(prev);
      const current = updated.get(movementId) || 
                     todayMovements.find(m => (m.movementId || `${m.voucherId}-${m.movementIndex}`) === movementId) || 
                     tomorrowMovements.find(m => (m.movementId || `${m.voucherId}-${m.movementIndex}`) === movementId);
      if (current) {
        updated.set(movementId, { ...current, [field]: value });
      } else {
        // If not found, try to get from current movements
        const allMovements = [...todayMovements, ...tomorrowMovements];
        const found = allMovements.find(m => (m.movementId || `${m.voucherId}-${m.movementIndex}`) === movementId);
        if (found) {
          updated.set(movementId, { ...found, [field]: value });
        }
      }
      return updated;
    });
  };

  // Save movement changes
  const saveMovement = async (movement: Movement) => {
    const movementId = movement.movementId || `${movement.voucherId}-${movement.movementIndex}`;
    const editedMovement = editingMovements.get(movementId) || movement;
    
    try {
      setSavingMovementId(movementId);
      await voucherAPI.updateMovementDetails(movement.voucherId, movement.movementIndex, {
        driverDetails1: editedMovement.driverDetails1,
        driverDetails2: editedMovement.driverDetails2,
        vehicleNumber: editedMovement.vehicleNumber,
      });
      
      toast.success('Movement updated successfully');
      
      // Remove from editing state
      setEditingMovements(prev => {
        const updated = new Map(prev);
        updated.delete(movementId);
        return updated;
      });
      
      // Reload movements
      if (activeTab === 'today') {
        loadTodayMovements();
      } else if (activeTab === 'tomorrow') {
        loadTomorrowMovements();
      }
      loadStats();
    } catch (error: any) {
      console.error('Error saving movement:', error);
      toast.error(error?.response?.data?.error || 'Failed to update movement');
    } finally {
      setSavingMovementId(null);
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
                                          router.push(`/dashboard/services/voucher/view/${voucher.id}`);
                                        }}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          router.push(`/dashboard/services/voucher/edit/${voucher.id}`);
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
                              <TableHead>From</TableHead>
                              <TableHead>To</TableHead>
                              <TableHead>Driver Details 1</TableHead>
                              <TableHead>Driver Details 2</TableHead>
                              <TableHead>Vehicle Number</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {todayMovements.map((movement, idx) => {
                              const movementId = movement.movementId || `${movement.voucherId}-${movement.movementIndex}`;
                              const editedMovement = editingMovements.get(movementId) || movement;
                              
                              return (
                                <TableRow key={movementId}>
                                  <TableCell>{movement.routeNumber}</TableCell>
                                  <TableCell>{movement.date}</TableCell>
                                  <TableCell>{movement.time}</TableCell>
                                  <TableCell>{movement.agentName}</TableCell>
                                  <TableCell>{movement.guestName}</TableCell>
                                  <TableCell>{movement.mobile}</TableCell>
                                  <TableCell>{movement.pax}</TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="font-medium">{movement.from || 'N/A'}</div>
                                      <div className="text-gray-500">{movement.fromLocation || ''}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="font-medium">{movement.to || 'N/A'}</div>
                                      <div className="text-gray-500">{movement.toLocation || ''}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Textarea
                                      value={editedMovement.driverDetails1 || ''}
                                      onChange={(e) => updateMovementField(movementId, 'driverDetails1', e.target.value)}
                                      className="w-40 min-h-[60px] resize-none"
                                      placeholder="Driver 1"
                                      rows={3}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Textarea
                                      value={editedMovement.driverDetails2 || ''}
                                      onChange={(e) => updateMovementField(movementId, 'driverDetails2', e.target.value)}
                                      className="w-40 min-h-[60px] resize-none"
                                      placeholder="Driver 2"
                                      rows={3}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Textarea
                                      value={editedMovement.vehicleNumber || ''}
                                      onChange={(e) => updateMovementField(movementId, 'vehicleNumber', e.target.value)}
                                      className="w-40 min-h-[60px] resize-none"
                                      placeholder="Vehicle No"
                                      rows={3}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => saveMovement(movement)}
                                      disabled={savingMovementId === movementId}
                                    >
                                      {savingMovementId === movementId ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Save className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
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
                              <TableHead>From</TableHead>
                              <TableHead>To</TableHead>
                              <TableHead>Driver Details 1</TableHead>
                              <TableHead>Driver Details 2</TableHead>
                              <TableHead>Vehicle Number</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tomorrowMovements.map((movement, idx) => {
                              const movementId = movement.movementId || `${movement.voucherId}-${movement.movementIndex}`;
                              const editedMovement = editingMovements.get(movementId) || movement;
                              
                              return (
                                <TableRow key={movementId}>
                                  <TableCell>{movement.routeNumber}</TableCell>
                                  <TableCell>{movement.date}</TableCell>
                                  <TableCell>{movement.time}</TableCell>
                                  <TableCell>{movement.agentName}</TableCell>
                                  <TableCell>{movement.guestName}</TableCell>
                                  <TableCell>{movement.mobile}</TableCell>
                                  <TableCell>{movement.pax}</TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="font-medium">{movement.from || 'N/A'}</div>
                                      <div className="text-gray-500">{movement.fromLocation || ''}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="font-medium">{movement.to || 'N/A'}</div>
                                      <div className="text-gray-500">{movement.toLocation || ''}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Textarea
                                      value={editedMovement.driverDetails1 || ''}
                                      onChange={(e) => updateMovementField(movementId, 'driverDetails1', e.target.value)}
                                      className="w-40 min-h-[60px] resize-none"
                                      placeholder="Driver 1"
                                      rows={3}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Textarea
                                      value={editedMovement.driverDetails2 || ''}
                                      onChange={(e) => updateMovementField(movementId, 'driverDetails2', e.target.value)}
                                      className="w-40 min-h-[60px] resize-none"
                                      placeholder="Driver 2"
                                      rows={3}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Textarea
                                      value={editedMovement.vehicleNumber || ''}
                                      onChange={(e) => updateMovementField(movementId, 'vehicleNumber', e.target.value)}
                                      className="w-40 min-h-[60px] resize-none"
                                      placeholder="Vehicle No"
                                      rows={3}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => saveMovement(movement)}
                                      disabled={savingMovementId === movementId}
                                    >
                                      {savingMovementId === movementId ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Save className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
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

    </div>
  );
}