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
import { airportRouteMasterAPI, destinationMasterAPI } from '@/lib/api';
import { AirportRouteMaster, DestinationMaster, CreateAirportRouteMasterRequest, UpdateAirportRouteMasterRequest } from '@/types';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Plane, MapPin, Menu } from 'lucide-react';

export default function AirportRouteMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [airportRoutes, setAirportRoutes] = useState<AirportRouteMaster[]>([]);
  const [destinations, setDestinations] = useState<DestinationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFromDestination, setSelectedFromDestination] = useState<string>('');
  const [selectedToDestination, setSelectedToDestination] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<AirportRouteMaster | null>(null);
  const [formData, setFormData] = useState<CreateAirportRouteMasterRequest>({
    routeCode: '',
    routeName: '',
    fromAirport: '',
    toAirport: '',
    fromDestinationId: '',
    toDestinationId: '',
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
      loadAirportRoutes();
      loadDestinations();
    }
  }, []);

  const loadAirportRoutes = async () => {
    try {
      setLoading(true);
      const response = await airportRouteMasterAPI.getAll({ limit: 1000 });
      setAirportRoutes(response.data.airportRouteMasters || []);
    } catch (error) {
      toast.error('Failed to load airport routes');
      console.error('Error loading airport routes:', error);
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
      if (editingRoute) {
        await airportRouteMasterAPI.update(editingRoute.id, formData);
        toast.success('Airport route updated successfully');
      } else {
        await airportRouteMasterAPI.create(formData);
        toast.success('Airport route created successfully');
      }
      setShowCreateForm(false);
      setEditingRoute(null);
      setFormData({
        routeCode: '',
        routeName: '',
        fromAirport: '',
        toAirport: '',
        fromDestinationId: '',
        toDestinationId: '',
        description: ''
      });
      loadAirportRoutes();
    } catch (error) {
      toast.error('Failed to save airport route');
      console.error('Error saving airport route:', error);
    }
  };

  const handleEdit = (route: AirportRouteMaster) => {
    setEditingRoute(route);
    setFormData({
      routeCode: route.routeCode,
      routeName: route.routeName,
      fromAirport: route.fromAirport,
      toAirport: route.toAirport,
      fromDestinationId: route.fromDestinationId || '',
      toDestinationId: route.toDestinationId || '',
      description: route.description || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this airport route?')) return;
    try {
      await airportRouteMasterAPI.delete(id);
      toast.success('Airport route deleted successfully');
      loadAirportRoutes();
    } catch (error) {
      toast.error('Failed to delete airport route');
      console.error('Error deleting airport route:', error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await airportRouteMasterAPI.toggleStatus(id);
      toast.success('Airport route status updated');
      loadAirportRoutes();
    } catch (error) {
      toast.error('Failed to update airport route status');
      console.error('Error updating airport route status:', error);
    }
  };

  const filteredRoutes = airportRoutes.filter(route => {
    const matchesSearch = route.routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         route.routeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         route.fromAirport.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         route.toAirport.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFromDestination = !selectedFromDestination || route.fromDestinationId === selectedFromDestination;
    const matchesToDestination = !selectedToDestination || route.toDestinationId === selectedToDestination;
    return matchesSearch && matchesFromDestination && matchesToDestination;
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
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Airport Route Master</h1>
                  <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                    Manage airport routes and connections
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Airport Route
              </Button>
            </div>
          </div>

          <div className="p-4 lg:p-8 space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Airport Routes</CardTitle>
                <CardDescription>
                  Manage airport routes and connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search airport routes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedFromDestination} onValueChange={setSelectedFromDestination}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by from destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All From Destinations</SelectItem>
                        {destinations.map((destination) => (
                          <SelectItem key={destination.id} value={destination.id}>
                            {destination.destinationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedToDestination} onValueChange={setSelectedToDestination}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by to destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All To Destinations</SelectItem>
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Airport Route Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage airport routes for travel bookings
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Route
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
                placeholder="Search routes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <Select value={selectedFromDestination} onValueChange={setSelectedFromDestination}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="From destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All From Destinations</SelectItem>
                {destinations.map((destination) => (
                  <SelectItem key={destination.id} value={destination.id}>
                    {destination.destinationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedToDestination} onValueChange={setSelectedToDestination}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="To destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All To Destinations</SelectItem>
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
            <CardTitle>{editingRoute ? 'Edit Airport Route' : 'Create New Airport Route'}</CardTitle>
            <CardDescription>
              {editingRoute ? 'Update airport route information' : 'Add a new airport route to the system'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="routeCode">Route Code *</Label>
                  <Input
                    id="routeCode"
                    value={formData.routeCode}
                    onChange={(e) => setFormData({ ...formData, routeCode: e.target.value })}
                    placeholder="e.g., JED-MAK, DEL-JED"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routeName">Route Name *</Label>
                  <Input
                    id="routeName"
                    value={formData.routeName}
                    onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                    placeholder="e.g., Jeddah to Makkah"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromAirport">From Airport *</Label>
                  <Input
                    id="fromAirport"
                    value={formData.fromAirport}
                    onChange={(e) => setFormData({ ...formData, fromAirport: e.target.value })}
                    placeholder="e.g., Jeddah"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toAirport">To Airport *</Label>
                  <Input
                    id="toAirport"
                    value={formData.toAirport}
                    onChange={(e) => setFormData({ ...formData, toAirport: e.target.value })}
                    placeholder="e.g., Makkah"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromDestinationId">From Destination</Label>
                  <Select value={formData.fromDestinationId} onValueChange={(value) => setFormData({ ...formData, fromDestinationId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select from destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No destination</SelectItem>
                      {destinations.map((destination) => (
                        <SelectItem key={destination.id} value={destination.id}>
                          {destination.destinationName} - {destination.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDestinationId">To Destination</Label>
                  <Select value={formData.toDestinationId} onValueChange={(value) => setFormData({ ...formData, toDestinationId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select to destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No destination</SelectItem>
                      {destinations.map((destination) => (
                        <SelectItem key={destination.id} value={destination.id}>
                          {destination.destinationName} - {destination.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    setEditingRoute(null);
                    setFormData({
                      routeCode: '',
                      routeName: '',
                      fromAirport: '',
                      toAirport: '',
                      fromDestinationId: '',
                      toDestinationId: '',
                      description: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRoute ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Airport Routes List */}
      <div className="grid gap-4">
        {filteredRoutes.map((route) => (
          <Card key={route.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Plane className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{route.routeName}</h3>
                    <p className="text-sm text-gray-600">
                      {route.fromAirport} → {route.toAirport}
                    </p>
                    <p className="text-xs text-gray-500">Code: {route.routeCode}</p>
                    {route.fromDestination && route.toDestination && (
                      <p className="text-xs text-gray-500">
                        {route.fromDestination.destinationName} → {route.toDestination.destinationName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={route.isActive ? 'default' : 'secondary'}>
                    {route.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(route.id)}
                  >
                    {route.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(route)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(route.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {route.description && (
                <div className="mt-3 text-sm text-gray-600">
                  {route.description}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRoutes.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No airport routes found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedFromDestination || selectedToDestination ? 'Try adjusting your search terms' : 'Get started by creating your first airport route'}
            </p>
            {!searchTerm && !selectedFromDestination && !selectedToDestination && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Route
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
