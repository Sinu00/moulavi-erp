'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { destinationMasterAPI } from '@/lib/api';
import { DestinationMaster, CreateDestinationMasterRequest, UpdateDestinationMasterRequest } from '@/types';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, MapPin, Menu } from 'lucide-react';

export default function DestinationMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [destinations, setDestinations] = useState<DestinationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDestination, setEditingDestination] = useState<DestinationMaster | null>(null);
  const [formData, setFormData] = useState<CreateDestinationMasterRequest>({
    destinationCode: '',
    destinationName: '',
    city: '',
    country: '',
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
      loadDestinations();
    }
  }, []);

  const loadDestinations = async () => {
    try {
      setLoading(true);
      const response = await destinationMasterAPI.getAll({ limit: 1000 });
      setDestinations(response.data.destinationMasters || []);
    } catch (error) {
      toast.error('Failed to load destinations');
      console.error('Error loading destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDestination) {
        await destinationMasterAPI.update(editingDestination.id, formData);
        toast.success('Destination updated successfully');
      } else {
        await destinationMasterAPI.create(formData);
        toast.success('Destination created successfully');
      }
      setShowCreateForm(false);
      setEditingDestination(null);
      setFormData({
        destinationCode: '',
        destinationName: '',
        city: '',
        country: '',
        description: ''
      });
      loadDestinations();
    } catch (error: any) {
      console.error('Error saving destination:', error);
      
      const errorMessage = error.response?.data?.error || 'Failed to save destination';
      const errorDetails = error.response?.data?.details || '';
      
      if (errorDetails) {
        if (Array.isArray(errorDetails)) {
          // Handle validation errors array
          const validationErrors = errorDetails.map((err: any) => err.msg || err.message).join(', ');
          toast.error(`${errorMessage}: ${validationErrors}`);
        } else {
          toast.error(`${errorMessage}: ${errorDetails}`);
        }
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleEdit = (destination: DestinationMaster) => {
    setEditingDestination(destination);
    setFormData({
      destinationCode: destination.destinationCode,
      destinationName: destination.destinationName,
      city: destination.city,
      country: destination.country,
      description: destination.description || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this destination?')) return;
    try {
      await destinationMasterAPI.delete(id);
      toast.success('Destination deleted successfully');
      loadDestinations();
    } catch (error) {
      toast.error('Failed to delete destination');
      console.error('Error deleting destination:', error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await destinationMasterAPI.toggleStatus(id);
      toast.success('Destination status updated');
      loadDestinations();
    } catch (error) {
      toast.error('Failed to update destination status');
      console.error('Error updating destination status:', error);
    }
  };

  const filteredDestinations = destinations.filter(destination =>
    destination.destinationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    destination.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    destination.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    destination.destinationCode.toLowerCase().includes(searchTerm.toLowerCase())
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
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Destination Master</h1>
                  <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                    Manage travel destinations
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Destination
              </Button>
            </div>
          </div>

          <div className="p-4 lg:p-8 space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Destinations</CardTitle>
                <CardDescription>
                  Manage travel destinations and locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search destinations..."
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Destination Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage destinations for Umrah visa bookings
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Destination
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
              placeholder="Search destinations..."
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
            <CardTitle>{editingDestination ? 'Edit Destination' : 'Create New Destination'}</CardTitle>
            <CardDescription>
              {editingDestination ? 'Update destination information' : 'Add a new destination to the system'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="destinationCode">Destination Code *</Label>
                  <Input
                    id="destinationCode"
                    value={formData.destinationCode}
                    onChange={(e) => setFormData({ ...formData, destinationCode: e.target.value })}
                    placeholder="e.g., MAK, MAD, JED"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationName">Destination Name *</Label>
                  <Input
                    id="destinationName"
                    value={formData.destinationName}
                    onChange={(e) => setFormData({ ...formData, destinationName: e.target.value })}
                    placeholder="e.g., Makkah, Madinah, Jeddah"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g., Makkah, Madinah, Jeddah"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., Saudi Arabia, UAE, India"
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
                    setEditingDestination(null);
                    setFormData({
                      destinationCode: '',
                      destinationName: '',
                      city: '',
                      country: '',
                      description: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingDestination ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Destinations List */}
      <div className="grid gap-4">
        {filteredDestinations.map((destination) => (
          <Card key={destination.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{destination.destinationName}</h3>
                    <p className="text-sm text-gray-600">
                      {destination.city}, {destination.country}
                    </p>
                    <p className="text-xs text-gray-500">Code: {destination.destinationCode}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={destination.isActive ? 'default' : 'secondary'}>
                    {destination.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(destination.id)}
                  >
                    {destination.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(destination)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(destination.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {destination.description && (
                <div className="mt-3 text-sm text-gray-600">
                  {destination.description}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDestinations.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No destinations found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first destination'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Destination
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
