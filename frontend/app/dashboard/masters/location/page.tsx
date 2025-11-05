'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { useLocationMaster } from '@/hooks/useLocationMaster';
import Sidebar from '@/components/Sidebar';
import LocationStatsCards from '@/components/location/LocationStatsCards';
import LocationTable from '@/components/LocationTable';
import LocationForm from '@/components/location/LocationForm';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { countryMasterAPI, cityMasterAPI } from '@/lib/api';
import { Plus, Menu, Trash2, Download, MapPin } from 'lucide-react';
import { LocationMaster, LocationType, CreateLocationMasterRequest } from '@/types';

export default function LocationMasterPage() {
  const router = useRouter();
  const [user] = useState(() => getUser()); // Memoize user to prevent unnecessary re-renders
  // Memoize hasRole check using the memoized user to prevent re-evaluation
  // hasRole internally calls getUser() which creates new object references, so we pass user directly
  const userHasAccess = useMemo(() => {
    if (!user) return false;
    const roles = ['admin', 'staff'];
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
  }, [user]);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationMaster | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    open: boolean;
    loading: boolean;
  }>({
    open: false,
    loading: false
  });
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [filterLocationType, setFilterLocationType] = useState<LocationType | undefined>(undefined);
  const [formData, setFormData] = useState<CreateLocationMasterRequest>({
    code: '',
    name: '',
    locationType: 'HOTEL',
    countryId: '',
    cityId: '',
    city: '',
    isActive: true
  });
  const [mounted, setMounted] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [countriesLoaded, setCountriesLoaded] = useState(false);
  
  // Extract countryId separately to prevent useEffect from running on every formData change
  const selectedCountryId = formData.countryId;

  const {
    locations,
    loading,
    searchTerm,
    setSearchTerm,
    filterLocationType: hookFilterLocationType,
    setFilterLocationType: setHookFilterLocationType,
    filteredLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleLocationStatus
  } = useLocationMaster();

  useEffect(() => {
    // Only load countries once when component mounts
    if (countriesLoaded || !userHasAccess) {
      console.log('[LocationMaster] useEffect: loadCountries skipped', { 
        countriesLoaded, 
        userHasAccess 
      });
      return;
    }

    console.log('[LocationMaster] useEffect: loadCountries triggered', { user: !!user });
    let cancelled = false;
    
    const loadCountries = async () => {
      try {
        const response = await countryMasterAPI.getActive();
        console.log('[LocationMaster] Country getActive Response:', response);
        
        if (cancelled) {
          console.log('[LocationMaster] loadCountries cancelled, skipping setState');
          return;
        }
        
        console.log('[LocationMaster] Response data:', response.data);
        // Backend returns: { success: true, data: { countryMasters: [...] } }
        // Axios wraps it in response.data, so we need response.data.data.countryMasters
        const countries = response.data?.data?.countryMasters || response.data?.countryMasters || [];
        console.log('[LocationMaster] Extracted countries:', countries);
        const countryArray = Array.isArray(countries) ? countries : [];
        console.log('[LocationMaster] Setting countries array (length:', countryArray.length, '):', countryArray);
        if (countryArray.length === 0) {
          console.warn('[LocationMaster] No countries found - array is empty');
        }
        setCountries(countryArray);
        setCountriesLoaded(true);
      } catch (error: any) {
        if (cancelled) return;
        console.error('[LocationMaster] Error loading countries:', error);
        console.error('[LocationMaster] Error response:', error.response);
        toast.error('Failed to load countries. Please check if countries are seeded.');
        setCountries([]);
        setCountriesLoaded(true); // Mark as loaded even on error to prevent retry loop
      }
    };
    
    loadCountries();
    
    return () => {
      console.log('[LocationMaster] loadCountries cleanup');
      cancelled = true;
    };
  }, [user, countriesLoaded]);


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!userHasAccess) {
      router.push('/');
      return;
    }
  }, [userHasAccess, router]);

  // Load cities when country changes in form (only when form is open)
  // Use selectedCountryId instead of formData.countryId to prevent re-runs on every formData change
  useEffect(() => {
    console.log('[LocationMaster] useEffect: loadCities triggered', {
      showCreateForm,
      countryId: selectedCountryId,
      editingLocationId: editingLocation?.id,
      user: !!user
    });
    
    if (!showCreateForm || !selectedCountryId) {
      if (!showCreateForm) {
        console.log('[LocationMaster] Clearing cities - form not open');
        setCities([]);
      }
      return;
    }

    let cancelled = false;

    const loadCities = async () => {
      console.log('[LocationMaster] Loading cities for countryId:', selectedCountryId);
      try {
        const response = await cityMasterAPI.getActive({ countryId: selectedCountryId });
        const cityData = response.data?.cityMasters || [];
        console.log('[LocationMaster] Cities loaded:', cityData.length);
        
        if (cancelled) {
          console.log('[LocationMaster] loadCities cancelled, skipping setState');
          return;
        }
        
        setCities(Array.isArray(cityData) ? cityData : []);
        
        // If editing and cityId exists, ensure it's still valid
        if (editingLocation && editingLocation.cityId && !cityData.find((c: any) => c.id === editingLocation.cityId)) {
          console.log('[LocationMaster] City not found in active, loading all cities');
          const responseAll = await cityMasterAPI.getAll({ countryId: selectedCountryId });
          const allCityData = responseAll.data?.cityMasters || [];
          
          if (!cancelled) {
            setCities(Array.isArray(allCityData) ? allCityData : []);
          }
        }
      } catch (error) {
        if (cancelled) return;
        console.error('[LocationMaster] Error loading cities:', error);
        setCities([]);
      }
    };

    if (userHasAccess) {
      loadCities();
    }
    
    return () => {
      console.log('[LocationMaster] loadCities cleanup');
      cancelled = true;
    };
  }, [selectedCountryId, showCreateForm, editingLocation?.id, userHasAccess]); // Use memoized userHasAccess // Only depend on the primitive value, not the whole formData object

  // Sync filter state with hook
  // NOTE: setHookFilterLocationType should be stable, but only sync when filterLocationType actually changes
  useEffect(() => {
    console.log('[LocationMaster] useEffect: syncFilter triggered', { filterLocationType });
    setHookFilterLocationType(filterLocationType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLocationType]); // Only depend on filterLocationType, not the setter function

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LocationMaster] handleSubmit called', {
      editingLocation: editingLocation?.id,
      formData: { ...formData }
    });
    
    if (!formData.code || !formData.name || !formData.countryId || !formData.cityId || !formData.city) {
      console.log('[LocationMaster] Validation failed');
      toast.error('Please fill in all required fields including city');
      return;
    }
    
    console.log('[LocationMaster] Calling API...', editingLocation ? 'update' : 'create');
    const success = editingLocation 
      ? await updateLocation(editingLocation.id, formData)
      : await createLocation(formData);
    
    console.log('[LocationMaster] API response success:', success);
    
    if (success) {
      if (editingLocation) {
        handleLocationUpdated();
      } else {
        handleLocationCreated();
      }
    }
  };

  const handleLocationCreated = () => {
    console.log('[LocationMaster] handleLocationCreated called');
    setShowCreateForm(false);
    setEditingLocation(null);
    toast.success('Location created successfully!');
  };

  const handleLocationUpdated = () => {
    console.log('[LocationMaster] handleLocationUpdated called');
    setEditingLocation(null);
    setShowCreateForm(false);
    toast.success('Location updated successfully!');
  };

  const handleEdit = async (location: LocationMaster) => {
    console.log('[LocationMaster] handleEdit called', { locationId: location.id });
    setEditingLocation(location);
    setFormData({
      code: location.code,
      name: location.name,
      locationType: location.locationType,
      countryId: location.countryId,
      cityId: location.cityId || '',
      city: location.city,
      isActive: location.isActive
    });
    setShowCreateForm(true);
  };

  const handleSelectLocation = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLocations.length === filteredLocations.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(filteredLocations.map(location => location.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLocations.length === 0) {
      toast.error('Please select locations to delete');
      return false;
    }

    try {
      for (const locationId of selectedLocations) {
        await deleteLocation(locationId);
      }
      setSelectedLocations([]);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedLocations.length === 0) {
      toast.error('Please select locations to delete');
      return;
    }

    setBulkDeleteDialog({
      open: true,
      loading: false
    });
  };

  const confirmBulkDelete = async () => {
    setBulkDeleteDialog(prev => ({ ...prev, loading: true }));

    const success = await handleBulkDelete();
    if (success) {
      toast.success(`${selectedLocations.length} location(s) deleted successfully!`);
      setBulkDeleteDialog({ open: false, loading: false });
    } else {
      setBulkDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleLocationDeleted = () => {
    // Refresh locations list
    window.location.reload();
  };

  const resetForm = () => {
    console.log('[LocationMaster] resetForm called');
    setEditingLocation(null);
    setShowCreateForm(false);
    setCities([]);
    // Don't reset formData here - it will be reset when opening a new form
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (!user) {
    return null; // Prevent flash of content
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Location Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage hotels, airports, ziyarat, and other locations
                </p>
              </div>
            </div>
            
            {user && hasRole(['admin']) && (
              <Button 
                onClick={() => {
                  console.log('[LocationMaster] Add Location button clicked');
                  setEditingLocation(null);
                  setFormData({
                    code: '',
                    name: '',
                    locationType: 'HOTEL',
                    countryId: '',
                    cityId: '',
                    city: '',
                    isActive: true
                  });
                  setCities([]);
                  setShowCreateForm(true);
                  console.log('[LocationMaster] State updated - showCreateForm should be true');
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Location
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Stats Cards */}
          <LocationStatsCards locations={locations} />

          {/* Location Management */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold">Location Management</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage hotels, airports, ziyarat, and other locations
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedLocations.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDeleteClick}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedLocations.length})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info('Export functionality coming soon')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LocationTable
                locations={filteredLocations}
                loading={loading}
                searchTerm={searchTerm}
                filterLocationType={filterLocationType}
                selectedLocations={selectedLocations}
                setSearchTerm={setSearchTerm}
                onFilterChange={setFilterLocationType}
                onSelectLocation={handleSelectLocation}
                onSelectAll={handleSelectAll}
                onBulkDelete={handleBulkDeleteClick}
                onLocationDeleted={handleLocationDeleted}
                onEditLocation={handleEdit}
                onToggleStatus={toggleLocationStatus}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Form */}
      <Sheet 
        open={showCreateForm} 
        onOpenChange={(open) => {
          console.log('[LocationMaster] Sheet onOpenChange called', { open, showCreateForm });
          if (!open) {
            resetForm();
          } else {
            console.log('[LocationMaster] Sheet opening, setting showCreateForm to true');
            setShowCreateForm(true);
          }
        }}
      >
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </SheetTitle>
            <SheetDescription>
              {editingLocation ? 'Update location information' : 'Create a new hotel, airport, ziyarat, or other location'}
            </SheetDescription>
          </SheetHeader>
          <LocationForm
            formData={formData}
            editingLocation={editingLocation}
            countries={countries}
            cities={cities}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SheetContent>
      </Sheet>

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialog.open}
        onOpenChange={(open) => setBulkDeleteDialog(prev => ({ ...prev, open }))}
        title="Delete Locations"
        message="Are you sure you want to delete the selected locations? This will permanently remove all associated data."
        onConfirm={confirmBulkDelete}
        loading={bulkDeleteDialog.loading}
        type="bulk"
        count={selectedLocations.length}
      />
    </div>
  );
}
