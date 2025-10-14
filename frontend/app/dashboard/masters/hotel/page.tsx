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
import { hotelMasterAPI, destinationMasterAPI } from '@/lib/api';
import { HotelMaster, DestinationMaster, CreateHotelMasterRequest, UpdateHotelMasterRequest } from '@/types';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Building, MapPin, Menu } from 'lucide-react';

export default function HotelMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hotels, setHotels] = useState<HotelMaster[]>([]);
  const [destinations, setDestinations] = useState<DestinationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelMaster | null>(null);
  const [formData, setFormData] = useState<CreateHotelMasterRequest>({
    hotelCode: '',
    hotelName: '',
    locationId: ''
  });

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      loadHotels();
      loadDestinations();
    }
  }, []);

  const loadHotels = async () => {
    try {
      setLoading(true);
      const response = await hotelMasterAPI.getAll({ limit: 1000 });
      setHotels(response.data.hotelMasters || []);
    } catch (error) {
      toast.error('Failed to load hotels');
      console.error('Error loading hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDestinations = async () => {
    try {
      const response = await destinationMasterAPI.getActive();
      setDestinations(response.data.destinationMasters || []);
    } catch (error) {
      toast.error('Failed to load destinations');
      console.error('Error loading destinations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHotel) {
        await hotelMasterAPI.update(editingHotel.id, formData);
        toast.success('Hotel updated successfully');
      } else {
        await hotelMasterAPI.create(formData);
        toast.success('Hotel created successfully');
      }
      setShowCreateForm(false);
      setEditingHotel(null);
      setFormData({
        hotelCode: '',
        hotelName: '',
        locationId: ''
      });
      loadHotels();
    } catch (error) {
      toast.error('Failed to save hotel');
      console.error('Error saving hotel:', error);
    }
  };

  const handleEdit = (hotel: HotelMaster) => {
    setEditingHotel(hotel);
    setFormData({
      hotelCode: hotel.hotelCode,
      hotelName: hotel.hotelName,
      locationId: hotel.locationId
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hotel?')) return;
    try {
      await hotelMasterAPI.delete(id);
      toast.success('Hotel deleted successfully');
      loadHotels();
    } catch (error) {
      toast.error('Failed to delete hotel');
      console.error('Error deleting hotel:', error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await hotelMasterAPI.toggleStatus(id);
      toast.success('Hotel status updated');
      loadHotels();
    } catch (error) {
      toast.error('Failed to update hotel status');
      console.error('Error updating hotel status:', error);
    }
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    // This function is no longer needed
  };

  const filteredHotels = hotels.filter(hotel => {
    const matchesSearch = hotel.hotelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hotel.hotelCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !selectedDestination || hotel.locationId === selectedDestination;
    return matchesSearch && matchesLocation;
  });

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
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Hotel Master</h1>
                  <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                    Manage hotels for accommodation bookings
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Hotel
              </Button>
            </div>
          </div>

          <div className="p-4 lg:p-8 space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Hotels</CardTitle>
                <CardDescription>
                  Manage hotel information and availability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search hotels..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Destinations</SelectItem>
                        {destinations.map((destination) => (
                          <SelectItem key={destination.id} value={destination.id}>
                            {destination.destinationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Hotel Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage hotels for accommodation bookings
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Hotel
            </Button>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search hotels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <Select value={selectedDestination} onValueChange={setSelectedDestination}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Destinations</SelectItem>
                {destinations.map((destination) => (
                  <SelectItem key={destination.id} value={destination.id}>
                    {destination.destinationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingHotel ? 'Edit Hotel' : 'Create New Hotel'}</CardTitle>
            <CardDescription>
              {editingHotel ? 'Update hotel information' : 'Add a new hotel to the system'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hotelCode">Hotel Code *</Label>
                  <Input
                    id="hotelCode"
                    value={formData.hotelCode}
                    onChange={(e) => setFormData({ ...formData, hotelCode: e.target.value })}
                    placeholder="e.g., MAK001, MAD001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hotelName">Hotel Name *</Label>
                  <Input
                    id="hotelName"
                    value={formData.hotelName}
                    onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                    placeholder="e.g., Makkah Clock Royal Tower"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locationId">Location *</Label>
                  <Select value={formData.locationId || ''} onValueChange={(value) => setFormData({ ...formData, locationId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map((destination) => (
                        <SelectItem key={destination.id} value={destination.id}>
                          {destination.destinationName} - {destination.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingHotel(null);
                    setFormData({
                      hotelCode: '',
                      hotelName: '',
                      locationId: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingHotel ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Hotels List */}
      <div className="grid gap-4">
        {filteredHotels.map((hotel) => (
          <Card key={hotel.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <Building className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{hotel.hotelName}</h3>
                    <p className="text-sm text-gray-600">
                      {hotel.location?.destinationName}
                    </p>
                    <p className="text-xs text-gray-500">
                      Code: {hotel.hotelCode}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={hotel.isActive ? 'default' : 'secondary'}>
                    {hotel.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(hotel.id)}
                  >
                    {hotel.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(hotel)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(hotel.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredHotels.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hotels found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedDestination ? 'Try adjusting your search terms' : 'Get started by creating your first hotel'}
            </p>
            {!searchTerm && !selectedDestination && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Hotel
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
