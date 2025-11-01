'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { useCountryMaster } from '@/hooks/useCountryMaster';
import Sidebar from '@/components/Sidebar';
import CountryStatsCards from '@/components/country/CountryStatsCards';
import CountryTable from '@/components/CountryTable';
import CountryForm from '@/components/country/CountryForm';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { currencyMasterAPI, countryMasterAPI } from '@/lib/api';
import { Plus, Menu, Trash2, Download } from 'lucide-react';
import { CountryMaster, CreateCountryMasterRequest } from '@/types';

export default function CountryMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryMaster | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    open: boolean;
    loading: boolean;
  }>({
    open: false,
    loading: false
  });
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateCountryMasterRequest>({
    countryCode: '',
    countryName: '',
    currencyCode: ''
  });
  const [mounted, setMounted] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);

  const {
    countries,
    loading,
    searchTerm,
    setSearchTerm,
    filteredCountries,
    loadCountries
  } = useCountryMaster();

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await currencyMasterAPI.getActive();
        console.log('Currency getActive Response:', response);
        console.log('Response data:', response.data);
        // Backend returns: { success: true, data: { currencyMasters: [...] } }
        // Axios wraps it in response.data, so we need response.data.data.currencyMasters
        const currencies = response.data?.data?.currencyMasters || response.data?.currencyMasters || response.data || [];
        console.log('Extracted currencies:', currencies);
        const currencyArray = Array.isArray(currencies) ? currencies : [];
        console.log('Setting currencies array (length:', currencyArray.length, '):', currencyArray);
        if (currencyArray.length === 0) {
          console.warn('No currencies found - array is empty');
        }
        setCurrencies(currencyArray);
      } catch (error: any) {
        console.error('Error loading currencies:', error);
        console.error('Error response:', error.response);
        toast.error('Failed to load currencies. Please check if currencies are seeded.');
        setCurrencies([]);
      }
    };
    if (user && hasRole(['admin', 'staff'])) {
      loadCurrencies();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.countryCode || !formData.countryName || !formData.currencyCode) {
      return;
    }
    
    try {
      if (editingCountry) {
        const response = await countryMasterAPI.update(editingCountry.id, formData);
        console.log('Update response:', response);
        handleCountryUpdated();
      } else {
        const response = await countryMasterAPI.create(formData);
        console.log('Create response:', response);
        handleCountryCreated();
      }
    } catch (error: any) {
      console.error('Error saving country:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save country';
      toast.error(errorMessage);
    }
  };

  const handleCountryCreated = () => {
    setShowCreateForm(false);
    setEditingCountry(null);
    toast.success('Country created successfully!');
    loadCountries();
  };

  const handleCountryUpdated = () => {
    setEditingCountry(null);
    setShowCreateForm(false);
    toast.success('Country updated successfully!');
    loadCountries();
  };

  const handleEdit = (country: CountryMaster) => {
    setEditingCountry(country);
    setFormData({
      countryCode: country.countryCode,
      countryName: country.countryName,
      currencyCode: country.currencyCode,
    });
    setShowCreateForm(true);
  };

  const handleSelectCountry = (countryId: string) => {
    setSelectedCountries(prev => 
      prev.includes(countryId) 
        ? prev.filter(id => id !== countryId)
        : [...prev, countryId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCountries.length === filteredCountries.length) {
      setSelectedCountries([]);
    } else {
      setSelectedCountries(filteredCountries.map(country => country.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCountries.length === 0) {
      toast.error('Please select countries to delete');
      return false;
    }

    try {
      for (const countryId of selectedCountries) {
        try {
          await countryMasterAPI.delete(countryId);
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to delete country';
          toast.error(errorMessage);
          // Continue with other deletions even if one fails
        }
      }
      setSelectedCountries([]);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedCountries.length === 0) {
      toast.error('Please select countries to delete');
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
      toast.success(`${selectedCountries.length} country(s) deleted successfully!`);
      setBulkDeleteDialog({ open: false, loading: false });
      loadCountries();
    } else {
      setBulkDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCountryDeleted = () => {
    loadCountries();
  };

  const handleToggleStatus = async (country: CountryMaster) => {
    try {
      await countryMasterAPI.toggleStatus(country.id);
      toast.success(`Country ${country.isActive ? 'deactivated' : 'activated'} successfully`);
      loadCountries();
    } catch (error) {
      // Error handling is done by API interceptor
    }
  };

  const resetForm = () => {
    setFormData({
      countryCode: '',
      countryName: '',
      currencyCode: '',
    });
    setEditingCountry(null);
    setShowCreateForm(false);
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (!user) {
    return null; // Prevent flash of content
  }

  if (loading) {
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
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Country Master</h1>
                  <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                    Manage countries and nationalities
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Country
              </Button>
            </div>
          </div>

          <div className="p-4 lg:p-8 space-y-6">
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Table Skeleton */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Country Management</CardTitle>
                <CardDescription>
                  Manage countries and their currencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CountryTable
                  countries={[]}
                  loading={true}
                  searchTerm=""
                  selectedCountries={[]}
                  setSearchTerm={() => {}}
                  onSelectCountry={() => {}}
                  onSelectAll={() => {}}
                  onBulkDelete={() => {}}
                  onCountryDeleted={() => {}}
                  onEditCountry={() => {}}
                  onToggleStatus={() => {}}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Country Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage countries and nationalities
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Country
            </Button>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Stats Cards */}
          <CountryStatsCards countries={countries} />

          {/* Country Management */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold">Country Management</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage countries and their currencies
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCountries.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDeleteClick}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedCountries.length})
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
              <CountryTable
                countries={filteredCountries}
                loading={loading}
                searchTerm={searchTerm}
                selectedCountries={selectedCountries}
                setSearchTerm={setSearchTerm}
                onSelectCountry={handleSelectCountry}
                onSelectAll={handleSelectAll}
                onBulkDelete={handleBulkDeleteClick}
                onCountryDeleted={handleCountryDeleted}
                onEditCountry={handleEdit}
                onToggleStatus={handleToggleStatus}
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
              {editingCountry ? 'Edit Country' : 'Add New Country'}
            </SheetTitle>
            <SheetDescription>
              {editingCountry ? 'Update country information' : 'Create a new country with its currency'}
            </SheetDescription>
          </SheetHeader>
          <CountryForm
            formData={formData}
            editingCountry={editingCountry}
            currencies={currencies}
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
        title="Delete Countries"
        message="Are you sure you want to delete the selected countries? This will permanently remove all associated data."
        onConfirm={confirmBulkDelete}
        loading={bulkDeleteDialog.loading}
        type="bulk"
        count={selectedCountries.length}
      />
    </div>
  );
}
