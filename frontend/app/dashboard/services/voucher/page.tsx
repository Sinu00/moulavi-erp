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
  Download,
  Ticket,
  Calendar,
  Users,
  TrendingUp,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { getUser, hasRole } from '@/lib/auth';
import { voucherAPI } from '@/lib/api';
import api from '@/lib/api';
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
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);

  // Filter options and active filters
  const [availableFromOptions, setAvailableFromOptions] = useState<string[]>([]);
  const [availableToOptions, setAvailableToOptions] = useState<string[]>([]);
  const [selectedFrom, setSelectedFrom] = useState<string | null>(null);
  const [selectedTo, setSelectedTo] = useState<string | null>(null);
  const [showTodayFilters, setShowTodayFilters] = useState(false);
  const [showTomorrowFilters, setShowTomorrowFilters] = useState(false);
  const [todayRouteSearch, setTodayRouteSearch] = useState('');
  const [tomorrowRouteSearch, setTomorrowRouteSearch] = useState('');

  // Movement Stats
  const [todayStats, setTodayStats] = useState<Array<{from: string, to: string, count: number}>>([]);
  const [tomorrowStats, setTomorrowStats] = useState<Array<{from: string, to: string, count: number}>>([]);
  const [loadingMovementStats, setLoadingMovementStats] = useState(false);


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

  const loadFilterOptions = async () => {
    try {
      const response = await voucherAPI.getMovementFilterOptions();
      setAvailableFromOptions(response.data.fromOptions || []);
      setAvailableToOptions(response.data.toOptions || []);
    } catch (error) {
      console.error('Error loading filter options:', error);
      toast.error('Failed to load filter options');
    }
  };

  const loadTodayMovements = async () => {
    try {
      setLoadingMovements(true);
      const from = selectedFrom && selectedFrom !== 'all' ? selectedFrom : undefined;
      const to = selectedTo && selectedTo !== 'all' ? selectedTo : undefined;
      const response = await voucherAPI.getTodayMovements(from, to);
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
      const from = selectedFrom && selectedFrom !== 'all' ? selectedFrom : undefined;
      const to = selectedTo && selectedTo !== 'all' ? selectedTo : undefined;
      const response = await voucherAPI.getTomorrowMovements(from, to);
      setTomorrowMovements(response.data.movements);
    } catch (error) {
      console.error('Error loading tomorrow movements:', error);
      toast.error('Failed to load tomorrow movements');
    } finally {
      setLoadingMovements(false);
    }
  };

  const loadTodayStats = async () => {
    try {
      setLoadingMovementStats(true);
      const response = await voucherAPI.getTodayMovementStats();
      setTodayStats(response.data.stats || []);
    } catch (error) {
      console.error('Error loading today stats:', error);
      toast.error('Failed to load today statistics');
    } finally {
      setLoadingMovementStats(false);
    }
  };

  const loadTomorrowStats = async () => {
    try {
      setLoadingMovementStats(true);
      const response = await voucherAPI.getTomorrowMovementStats();
      setTomorrowStats(response.data.stats || []);
    } catch (error) {
      console.error('Error loading tomorrow stats:', error);
      toast.error('Failed to load tomorrow statistics');
    } finally {
      setLoadingMovementStats(false);
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

  // Download voucher PDF
  const downloadVoucherPDF = async (voucherId: string) => {
    try {
      setDownloadingVoucherId(voucherId);
      
      // Fetch voucher data
      const response = await voucherAPI.getVoucherById(voucherId);
      const voucher = response.data.voucher;
      
      // Format data for PDF generation (same format as VoucherPreviewDialog)
      const pdfData = {
        voucherNumber: voucher.voucherNumber,
        reservationNumber: voucher.voucherNumber, // Use voucherNumber as reservation number
        reservationDate: voucher.reservationDate ? (typeof voucher.reservationDate === 'string' 
          ? voucher.reservationDate.split('T')[0] 
          : new Date(voucher.reservationDate).toISOString().split('T')[0]) : '',
        guestName: voucher.guestName || '',
        guestMobile: voucher.guestMobile || '',
        groupCode: voucher.groupCode || '',
        paxCount: voucher.paxCount || 0,
        umrahVisaProvider: voucher.booking?.party ? {
          partyName: voucher.booking.party.partyName || '',
          address: voucher.booking.party.address || '',
          city: voucher.booking.party.city || '',
          state: voucher.booking.party.state || '',
          country: voucher.booking.party.country || '',
          contactNumber: voucher.booking.party.contactNumber || '',
          whatsappNumber: voucher.booking.party.whatsappNumber || '',
          email: voucher.booking.party.email || '',
        } : null, // Will be null if not available - PDF service handles this
        hotelSchedules: (voucher.hotelSchedules || []).map((hs: any) => ({
          number: hs.number || 0,
          location: hs.location || '', // City name
          hotelName: hs.hotelName || '', // Hotel name
          checkIn: hs.checkIn ? (typeof hs.checkIn === 'string' 
            ? hs.checkIn.split('T')[0] 
            : new Date(hs.checkIn).toISOString().split('T')[0]) : '',
          checkOut: hs.checkOut ? (typeof hs.checkOut === 'string' 
            ? hs.checkOut.split('T')[0] 
            : new Date(hs.checkOut).toISOString().split('T')[0]) : '',
          days: hs.days || 0,
          brn: hs.brn || null,
        })),
        movementDetails: (voucher.movementDetails || []).map((md: any) => ({
          sr: md.sr || 0,
          route: md.route || '',
          date: md.date ? (typeof md.date === 'string' 
            ? md.date.split('T')[0] 
            : new Date(md.date).toISOString().split('T')[0]) : '',
          time: md.time || '',
          from: md.from || '',
          fromLocation: md.fromLocation || '',
          to: md.to || '',
          toLocation: md.toLocation || '',
        })),
        flightDetails: (voucher.flightDetails || []).map((fd: any) => ({
          type: fd.type || 'AA',
          carrier: fd.carrier || '',
          number: fd.number || '',
          date: fd.date ? (typeof fd.date === 'string' 
            ? fd.date.split('T')[0] 
            : new Date(fd.date).toISOString().split('T')[0]) : '',
          arrivalAirport: fd.type === 'AA' ? (fd.from || '') : undefined,
          departureAirport: fd.type === 'AD' ? (fd.to || '') : undefined,
          from: fd.from || '',
          to: fd.to || '',
          etd: fd.etd || '',
          eta: fd.eta || '',
        })),
      };

      // Call backend to generate PDF
      const pdfResponse = await api.post('/umrah-visa/generate-pdf', pdfData, {
        responseType: 'blob',
      });

      // Create blob and download
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Voucher_${pdfData.voucherNumber}_${pdfData.guestName
        .replace(/\s+/g, '_')
        .slice(0, 20)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Voucher PDF downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading voucher PDF:', error);
      toast.error(error?.response?.data?.error || 'Failed to download voucher PDF');
    } finally {
      setDownloadingVoucherId(null);
    }
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
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    loadStats();
    loadFilterOptions();
    loadTodayStats();
    loadTomorrowStats();
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
      loadTodayStats();
    } else if (activeTab === 'tomorrow') {
      loadTomorrowMovements();
      loadTomorrowStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Reload movements when filters change
  useEffect(() => {
    if (activeTab === 'today') {
      loadTodayMovements();
    } else if (activeTab === 'tomorrow') {
      loadTomorrowMovements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFrom, selectedTo]);

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
              <CardContent className="space-y-3">
                {loadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                  <div className="text-3xl font-bold text-gray-900">{stats.todayMovements}</div>
                    {loadingMovementStats ? (
                      <div className="space-y-1 mt-3">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ) : todayStats.length > 0 ? (
                      <div className="mt-3 space-y-1.5">
                        <div className="text-xs font-medium text-gray-500 mb-2">Routes:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {todayStats.map((stat, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setActiveTab('today');
                                setSelectedFrom(stat.from);
                                setSelectedTo(stat.to);
                                setShowTodayFilters(true);
                              }}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-green-100 rounded border border-gray-200 hover:border-green-300 transition-colors cursor-pointer flex items-center gap-1"
                              title={`Click to filter: ${stat.from} → ${stat.to}`}
                            >
                              <span className="font-medium text-gray-700">{stat.from}</span>
                              <span className="text-gray-400">→</span>
                              <span className="font-medium text-gray-700">{stat.to}</span>
                              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                {stat.count}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">No routes available</p>
                    )}
                  </>
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
              <CardContent className="space-y-3">
                {loadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                  <div className="text-3xl font-bold text-gray-900">{stats.tomorrowMovements}</div>
                    {loadingMovementStats ? (
                      <div className="space-y-1 mt-3">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ) : tomorrowStats.length > 0 ? (
                      <div className="mt-3 space-y-1.5">
                        <div className="text-xs font-medium text-gray-500 mb-2">Routes:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {tomorrowStats.map((stat, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setActiveTab('tomorrow');
                                setSelectedFrom(stat.from);
                                setSelectedTo(stat.to);
                                setShowTomorrowFilters(true);
                              }}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-yellow-100 rounded border border-gray-200 hover:border-yellow-300 transition-colors cursor-pointer flex items-center gap-1"
                              title={`Click to filter: ${stat.from} → ${stat.to}`}
                            >
                              <span className="font-medium text-gray-700">{stat.from}</span>
                              <span className="text-gray-400">→</span>
                              <span className="font-medium text-gray-700">{stat.to}</span>
                              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                {stat.count}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">No routes available</p>
                    )}
                  </>
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
                                        title="View Voucher"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => downloadVoucherPDF(voucher.id)}
                                        disabled={downloadingVoucherId === voucher.id}
                                        title="Download PDF"
                                      >
                                        {downloadingVoucherId === voucher.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Download className="h-4 w-4" />
                                        )}
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
                    {/* Search and Filter Section */}
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4 items-center">
                        {/* Search Bar */}
                        <div className="flex-1 min-w-[250px]">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <Input
                              placeholder="Search by route number..."
                              value={todayRouteSearch}
                              onChange={(e) => setTodayRouteSearch(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        {/* Filter Button */}
                        <Button
                          variant="outline"
                          onClick={() => setShowTodayFilters(!showTodayFilters)}
                          className="w-full sm:w-auto"
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          Filters
                          {showTodayFilters ? (
                            <ChevronUp className="h-4 w-4 ml-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-2" />
                          )}
                          {(selectedFrom && selectedFrom !== 'all') || (selectedTo && selectedTo !== 'all') ? (
                            <Badge variant="secondary" className="ml-2">
                              {(selectedFrom && selectedFrom !== 'all' ? 1 : 0) + (selectedTo && selectedTo !== 'all' ? 1 : 0)}
                            </Badge>
                          ) : null}
                        </Button>
                      </div>

                      {showTodayFilters && (
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex flex-wrap gap-4 items-end">
                              <div className="flex-1 min-w-[200px]">
                                <Label htmlFor="from-filter">From</Label>
                                <Select
                                  value={selectedFrom || 'all'}
                                  onValueChange={(value) => setSelectedFrom(value === 'all' ? null : value)}
                                >
                                  <SelectTrigger id="from-filter">
                                    <SelectValue placeholder="All locations" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All locations</SelectItem>
                                    {availableFromOptions.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex-1 min-w-[200px]">
                                <Label htmlFor="to-filter">To</Label>
                                <Select
                                  value={selectedTo || 'all'}
                                  onValueChange={(value) => setSelectedTo(value === 'all' ? null : value)}
                                >
                                  <SelectTrigger id="to-filter">
                                    <SelectValue placeholder="All locations" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All locations</SelectItem>
                                    {availableToOptions.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedFrom(null);
                                  setSelectedTo(null);
                                }}
                                disabled={(!selectedFrom || selectedFrom === 'all') && (!selectedTo || selectedTo === 'all')}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Clear Filters
                              </Button>
                            </div>
                            {((selectedFrom && selectedFrom !== 'all') || (selectedTo && selectedTo !== 'all')) && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {selectedFrom && selectedFrom !== 'all' && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    From: {selectedFrom}
                                    <X
                                      className="h-3 w-3 cursor-pointer"
                                      onClick={() => setSelectedFrom(null)}
                                    />
                                  </Badge>
                                )}
                                {selectedTo && selectedTo !== 'all' && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    To: {selectedTo}
                                    <X
                                      className="h-3 w-3 cursor-pointer"
                                      onClick={() => setSelectedTo(null)}
                                    />
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {loadingMovements ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : (() => {
                      // Filter movements by route number
                      const filteredMovements = todayMovements.filter((movement) => {
                        if (!todayRouteSearch.trim()) return true;
                        return movement.routeNumber.toLowerCase().includes(todayRouteSearch.toLowerCase());
                      });

                      return filteredMovements.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {todayRouteSearch || (selectedFrom && selectedFrom !== 'all') || (selectedTo && selectedTo !== 'all') 
                              ? 'No movements found with selected filters' 
                              : 'No movements for today'}
                          </h3>
                          <p className="text-gray-500">
                            {todayRouteSearch || (selectedFrom && selectedFrom !== 'all') || (selectedTo && selectedTo !== 'all')
                              ? 'Try adjusting your search or filters to see movements.'
                              : 'No movements scheduled for today.'}
                          </p>
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
                              {filteredMovements.map((movement, idx) => {
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
                      );
                    })()}
                  </div>
                )}

                {activeTab === 'tomorrow' && (
                  <div className="space-y-4">
                    {/* Search and Filter Section */}
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4 items-center">
                        {/* Search Bar */}
                        <div className="flex-1 min-w-[250px]">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <Input
                              placeholder="Search by route number..."
                              value={tomorrowRouteSearch}
                              onChange={(e) => setTomorrowRouteSearch(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        {/* Filter Button */}
                        <Button
                          variant="outline"
                          onClick={() => setShowTomorrowFilters(!showTomorrowFilters)}
                          className="w-full sm:w-auto"
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          Filters
                          {showTomorrowFilters ? (
                            <ChevronUp className="h-4 w-4 ml-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-2" />
                          )}
                          {(selectedFrom && selectedFrom !== 'all') || (selectedTo && selectedTo !== 'all') ? (
                            <Badge variant="secondary" className="ml-2">
                              {(selectedFrom && selectedFrom !== 'all' ? 1 : 0) + (selectedTo && selectedTo !== 'all' ? 1 : 0)}
                            </Badge>
                          ) : null}
                        </Button>
                      </div>

                      {showTomorrowFilters && (
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex flex-wrap gap-4 items-end">
                              <div className="flex-1 min-w-[200px]">
                                <Label htmlFor="from-filter-tomorrow">From</Label>
                                <Select
                                  value={selectedFrom || 'all'}
                                  onValueChange={(value) => setSelectedFrom(value === 'all' ? null : value)}
                                >
                                  <SelectTrigger id="from-filter-tomorrow">
                                    <SelectValue placeholder="All locations" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All locations</SelectItem>
                                    {availableFromOptions.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex-1 min-w-[200px]">
                                <Label htmlFor="to-filter-tomorrow">To</Label>
                                <Select
                                  value={selectedTo || 'all'}
                                  onValueChange={(value) => setSelectedTo(value === 'all' ? null : value)}
                                >
                                  <SelectTrigger id="to-filter-tomorrow">
                                    <SelectValue placeholder="All locations" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All locations</SelectItem>
                                    {availableToOptions.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedFrom(null);
                                  setSelectedTo(null);
                                }}
                                disabled={(!selectedFrom || selectedFrom === 'all') && (!selectedTo || selectedTo === 'all')}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Clear Filters
                              </Button>
                            </div>
                            {((selectedFrom && selectedFrom !== 'all') || (selectedTo && selectedTo !== 'all')) && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {selectedFrom && selectedFrom !== 'all' && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    From: {selectedFrom}
                                    <X
                                      className="h-3 w-3 cursor-pointer"
                                      onClick={() => setSelectedFrom(null)}
                                    />
                                  </Badge>
                                )}
                                {selectedTo && selectedTo !== 'all' && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    To: {selectedTo}
                                    <X
                                      className="h-3 w-3 cursor-pointer"
                                      onClick={() => setSelectedTo(null)}
                                    />
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {loadingMovements ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : (() => {
                      // Filter movements by route number
                      const filteredMovements = tomorrowMovements.filter((movement) => {
                        if (!tomorrowRouteSearch.trim()) return true;
                        return movement.routeNumber.toLowerCase().includes(tomorrowRouteSearch.toLowerCase());
                      });

                      return filteredMovements.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {tomorrowRouteSearch || (selectedFrom && selectedFrom !== 'all') || (selectedTo && selectedTo !== 'all') 
                              ? 'No movements found with selected filters' 
                              : 'No movements for tomorrow'}
                          </h3>
                          <p className="text-gray-500">
                            {tomorrowRouteSearch || (selectedFrom && selectedFrom !== 'all') || (selectedTo && selectedTo !== 'all')
                              ? 'Try adjusting your search or filters to see movements.'
                              : 'No movements scheduled for tomorrow.'}
                          </p>
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
                              {filteredMovements.map((movement, idx) => {
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
                      );
                    })()}
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