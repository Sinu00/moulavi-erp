'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getUser, hasRole } from '@/lib/auth';
import { cityMasterAPI, vehicleTypeMasterAPI, fullTripMasterAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import FullTripCard from '@/components/fulltrip/FullTripCard';
import FullTripForm from '@/components/fulltrip/FullTripForm';
import FullTripDeleteConfirmationModal from '@/components/fulltrip/FullTripDeleteConfirmationModal';
import { Plus, Search, Route, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { CityMaster, VehicleTypeMaster, FullTripMaster, CreateFullTripMasterRequest } from '@/types';

export default function FullTripMasterPage() {
  const router = useRouter();
  const [user] = useState(() => getUser()); // Memoize user to prevent re-renders
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<FullTripMaster | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<FullTripMaster | null>(null);
  const [formData, setFormData] = useState<CreateFullTripMasterRequest>({
    fromCityId: '',
    toCityIds: [],
    vehicleTypeId: '',
    price: 0,
    isActive: true
  });
  const [cities, setCities] = useState<CityMaster[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeMaster[]>([]);
  const [trips, setTrips] = useState<FullTripMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
  }, [user, router]);

  // Load cities and vehicle types
  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) return;
    
    const loadMasterData = async () => {
      try {
        const [citiesResponse, vehicleTypesResponse] = await Promise.all([
          cityMasterAPI.getActive(),
          vehicleTypeMasterAPI.getActive(),
        ]);
        
        const citiesData = citiesResponse.data?.cityMasters || [];
        const vehicleTypesData = vehicleTypesResponse.data?.data?.vehicleTypeMasters || [];
        
        setCities(Array.isArray(citiesData) ? citiesData : []);
        setVehicleTypes(Array.isArray(vehicleTypesData) ? vehicleTypesData : []);
      } catch (error) {
        toast.error('Failed to load master data');
        console.error('Error loading master data:', error);
      }
    };
    loadMasterData();
  }, [user]);

  // Load full trips
  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      setLoading(false);
      return;
    }
    
    const loadTrips = async () => {
      setLoading(true);
      try {
        const response = await fullTripMasterAPI.getAll({ limit: '1000' });
        const tripsData = response.data?.fullTripMasters || [];
        setTrips(Array.isArray(tripsData) ? tripsData : []);
      } catch (error) {
        toast.error('Failed to load full trips');
        console.error('Error loading full trips:', error);
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };
    loadTrips();
  }, [user]);

  // Filter trips based on search
  const filteredTrips = trips.filter(trip => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    const vehicleName = trip.vehicleType?.vehicleName?.toLowerCase() || '';
    const fromCity = trip.fromCity?.name?.toLowerCase() || '';
    const toCities = (trip.toCities || [])
      .map(tc => tc.city?.name?.toLowerCase() || '')
      .join(' ');
    const price = trip.price.toString();
    
    return vehicleName.includes(search) ||
           fromCity.includes(search) ||
           toCities.includes(search) ||
           price.includes(search);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTrip) {
        await fullTripMasterAPI.update(editingTrip.id, formData);
        toast.success('Full trip updated successfully!');
      } else {
        await fullTripMasterAPI.create(formData);
        toast.success('Full trip created successfully!');
      }
      
      // Reload trips
      const response = await fullTripMasterAPI.getAll({ limit: '1000' });
      const tripsData = response.data?.fullTripMasters || [];
      setTrips(Array.isArray(tripsData) ? tripsData : []);
      
      resetForm();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to save full trip';
      toast.error(errorMessage);
      console.error('Error saving full trip:', error);
    }
  };

  const handleEdit = (trip: FullTripMaster) => {
    setEditingTrip(trip);
    setFormData({
      fromCityId: trip.fromCityId,
      toCityIds: (trip.toCities || [])
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
        .map(tc => tc.cityId),
      vehicleTypeId: trip.vehicleTypeId,
      price: trip.price,
      isActive: trip.isActive
    });
    setShowCreateForm(true);
  };

  const handleDeleteClick = (trip: FullTripMaster) => {
    setTripToDelete(trip);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tripToDelete) return;

    try {
      await fullTripMasterAPI.delete(tripToDelete.id);
      toast.success('Full trip deleted successfully!');
      
      // Reload trips
      const response = await fullTripMasterAPI.getAll({ limit: '1000' });
      const tripsData = response.data?.fullTripMasters || [];
      setTrips(Array.isArray(tripsData) ? tripsData : []);
      
      setShowDeleteModal(false);
      setTripToDelete(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete full trip';
      toast.error(errorMessage);
      console.error('Error deleting full trip:', error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setTripToDelete(null);
  };

  const handleToggleStatus = async (trip: FullTripMaster) => {
    try {
      await fullTripMasterAPI.toggleStatus(trip.id);
      toast.success(`Full trip ${trip.isActive ? 'deactivated' : 'activated'} successfully!`);
      
      // Reload trips
      const response = await fullTripMasterAPI.getAll({ limit: '1000' });
      const tripsData = response.data?.fullTripMasters || [];
      setTrips(Array.isArray(tripsData) ? tripsData : []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to toggle status';
      toast.error(errorMessage);
      console.error('Error toggling status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      fromCityId: '',
      toCityIds: [],
      vehicleTypeId: '',
      price: 0,
      isActive: true
    });
    setEditingTrip(null);
    setShowCreateForm(false);
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (!user || !hasRole(['admin', 'staff'])) {
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
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Full Trip Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage full trip routes with multiple destinations
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">Add Full Trip</span>
            </Button>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search full trips by route, vehicle type, or price..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Full Trips List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Full Trips ({filteredTrips.length})
              </CardTitle>
              <CardDescription>
                Manage full trip routes with multiple destination cities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="text-center py-12">
                  <Route className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No full trips found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'No full trips match your search criteria' : 'Get started by adding your first full trip'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Full Trip
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTrips.map((trip) => (
                    <FullTripCard
                      key={trip.id}
                      trip={trip}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Form */}
      <Sheet open={showCreateForm} onOpenChange={(open) => {
        setShowCreateForm(open);
        if (!open) {
          resetForm();
        }
      }}>
        <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingTrip ? 'Edit Full Trip' : 'Add New Full Trip'}
            </SheetTitle>
            <SheetDescription>
              {editingTrip ? 'Update full trip information' : 'Add a new full trip route to the system'}
            </SheetDescription>
          </SheetHeader>
          <FullTripForm
            formData={formData}
            editingTrip={editingTrip}
            cities={cities}
            vehicleTypes={vehicleTypes}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <FullTripDeleteConfirmationModal
        isOpen={showDeleteModal}
        trip={tripToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

