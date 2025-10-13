'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { countryMasterAPI } from '@/lib/api';
import { CountryMaster, CreateCountryMasterRequest, UpdateCountryMasterRequest } from '@/types';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, MapPin, Menu } from 'lucide-react';

export default function CountryMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [countries, setCountries] = useState<CountryMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryMaster | null>(null);
  const [formData, setFormData] = useState<CreateCountryMasterRequest>({
    countryCode: '',
    countryName: '',
    nationality: '',
    description: ''
  });

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      loadCountries();
    }
  }, []);

  const loadCountries = async () => {
    try {
      setLoading(true);
      const response = await countryMasterAPI.getAll({ limit: 1000 });
      setCountries(response.data.countryMasters || []);
    } catch (error) {
      toast.error('Failed to load countries');
      console.error('Error loading countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCountry) {
        await countryMasterAPI.update(editingCountry.id, formData);
        toast.success('Country updated successfully');
      } else {
        await countryMasterAPI.create(formData);
        toast.success('Country created successfully');
      }
      setShowCreateForm(false);
      setEditingCountry(null);
      setFormData({
        countryCode: '',
        countryName: '',
        nationality: '',
        description: ''
      });
      loadCountries();
    } catch (error) {
      toast.error('Failed to save country');
      console.error('Error saving country:', error);
    }
  };

  const handleEdit = (country: CountryMaster) => {
    setEditingCountry(country);
    setFormData({
      countryCode: country.countryCode,
      countryName: country.countryName,
      nationality: country.nationality,
      description: country.description || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this country?')) return;
    try {
      await countryMasterAPI.delete(id);
      toast.success('Country deleted successfully');
      loadCountries();
    } catch (error) {
      toast.error('Failed to delete country');
      console.error('Error deleting country:', error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await countryMasterAPI.toggleStatus(id);
      toast.success('Country status updated');
      loadCountries();
    } catch (error) {
      toast.error('Failed to update country status');
      console.error('Error updating country status:', error);
    }
  };

  const filteredCountries = countries.filter(country =>
    country.countryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.countryCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.nationality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return null;
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
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Countries</CardTitle>
                <CardDescription>
                  Manage countries and their information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search countries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Loading Skeleton */}
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <div className="flex space-x-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Create/Edit Form */}
          {showCreateForm && (
            <Card>
            <CardHeader>
                <CardTitle>{editingCountry ? 'Edit Country' : 'Create New Country'}</CardTitle>
                <CardDescription>
                  {editingCountry ? 'Update country information' : 'Add a new country to the system'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="countryCode">Country Code *</Label>
                      <Input
                        id="countryCode"
                        value={formData.countryCode}
                        onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                        placeholder="e.g., SA, AE, IN"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="countryName">Country Name *</Label>
                      <Input
                        id="countryName"
                        value={formData.countryName}
                        onChange={(e) => setFormData({ ...formData, countryName: e.target.value })}
                        placeholder="e.g., Saudi Arabia, UAE, India"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality *</Label>
                      <Input
                        id="nationality"
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                        placeholder="e.g., Saudi, Emirati, Indian"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingCountry(null);
                        setFormData({
                          countryCode: '',
                          countryName: '',
                          nationality: '',
                          description: ''
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingCountry ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Countries List */}
          <div className="grid gap-4">
            {filteredCountries.map((country) => (
              <Card key={country.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <MapPin className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{country.countryName}</h3>
                        <p className="text-sm text-gray-600">Nationality: {country.nationality}</p>
                        <p className="text-xs text-gray-500">Code: {country.countryCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={country.isActive ? 'default' : 'secondary'}>
                        {country.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(country.id)}
                      >
                        {country.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(country)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(country.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {country.description && (
                    <div className="mt-3 text-sm text-gray-600">
                      {country.description}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCountries.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No countries found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first country'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Country
                  </Button>
                )}
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  );
}
