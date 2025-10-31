'use client';

import { useEffect, useState } from 'react';
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
import { countryMasterAPI } from '@/lib/api';
import { Plus, Menu, Trash2, Download, MapPin } from 'lucide-react';
import { LocationMaster, LocationType, CreateLocationMasterRequest } from '@/types';

export default function LocationMasterPage() {
  const router = useRouter();
  const user = getUser();
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
    locationType: 'DESTINATION',
    countryId: '',
    city: '',
    isActive: true
  });
  const [mounted, setMounted] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);

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
    const loadCountries = async () => {
      try {
        const response = await countryMasterAPI.getActive();
        console.log('Country getActive Response:', response);
        console.log('Response data:', response.data);
        // Backend returns: { success: true, data: { countryMasters: [...] } }
        // Axios wraps it in response.data, so we need response.data.data.countryMasters
        const countries = response.data?.data?.countryMasters || response.data?.countryMasters || [];
        console.log('Extracted countries:', countries);
        const countryArray = Array.isArray(countries) ? countries : [];
        console.log('Setting countries array (length:', countryArray.length, '):', countryArray);
        if (countryArray.length === 0) {
          console.warn('No countries found - array is empty');
        }
        setCountries(countryArray);
      } catch (error: any) {
        console.error('Error loading countries:', error);
        console.error('Error response:', error.response);
        toast.error('Failed to load countries. Please check if countries are seeded.');
        setCountries([]);
      }
    };
    if (user && hasRole(['admin', 'staff'])) {
      loadCountries();
    }
  }, [user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
  }, [user, router]);

  // Sync filter state with hook
  useEffect(() => {
    setHookFilterLocationType(filterLocationType);
  }, [filterLocationType, setHookFilterLocationType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name || !formData.countryId || !formData.city) {
      return;
    }
    
    const success = editingLocation 
      ? await updateLocation(editingLocation.id, formData)
      : await createLocation(formData);
    
    if (success) {
      if (editingLocation) {
        handleLocationUpdated();
      } else {
        handleLocationCreated();
      }
    }
  };

  const handleLocationCreated = () => {
    setShowCreateForm(false);
    setEditingLocation(null);
    toast.success('Location created successfully!');
  };

  const handleLocationUpdated = () => {
    setEditingLocation(null);
    setShowCreateForm(false);
    toast.success('Location updated successfully!');
  };

  const handleEdit = (location: LocationMaster) => {
    setEditingLocation(location);
    setFormData({
      code: location.code,
      name: location.name,
      locationType: location.locationType,
      countryId: location.countryId,
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
    setFormData({
      code: '',
      name: '',
      locationType: 'DESTINATION',
      countryId: '',
      city: '',
      isActive: true
    });
    setEditingLocation(null);
    setShowCreateForm(false);
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
                  Manage airports, destinations, and ziyarat locations
                </p>
              </div>
            </div>
            
            {hasRole(['admin']) && (
              <Button 
                onClick={() => setShowCreateForm(true)}
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
                    Manage airports, destinations, and ziyarat locations
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
      <Sheet open={showCreateForm} onOpenChange={(open) => {
        setShowCreateForm(open);
        if (!open) {
          resetForm();
        }
      }}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </SheetTitle>
            <SheetDescription>
              {editingLocation ? 'Update location information' : 'Create a new airport, destination, or ziyarat location'}
            </SheetDescription>
          </SheetHeader>
          <LocationForm
            formData={formData}
            editingLocation={editingLocation}
            countries={countries}
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
