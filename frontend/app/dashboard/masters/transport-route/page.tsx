'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { useTransportRouteMaster } from '@/hooks/useTransportRouteMaster';
import Sidebar from '@/components/Sidebar';
import TransportRouteForm from '@/components/transport-route/TransportRouteForm';
import TransportRouteCard from '@/components/transport-route/TransportRouteCard';
import TransportRouteDeleteConfirmationModal from '@/components/transport-route/TransportRouteDeleteConfirmationModal';
import { cityMasterAPI } from '@/lib/api';
import { Plus, Menu, Route } from 'lucide-react';
import { TransportRouteMaster, CreateTransportRouteMasterRequest, RouteType } from '@/types';

export default function TransportRouteMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransportRouteMaster | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<TransportRouteMaster | null>(null);
  const [formData, setFormData] = useState<CreateTransportRouteMasterRequest>({
    city1Id: '',
    city2Id: '',
    city3Id: null,
    city4Id: null,
    routeType: 'citytocity',
    isActive: true,
  });
  const [mounted, setMounted] = useState(false);
  const [cities, setCities] = useState<any[]>([]);
  const [filterRouteType, setFilterRouteType] = useState<RouteType | undefined>(undefined);

  const {
    routes,
    loading,
    searchTerm,
    setSearchTerm,
    filteredRoutes,
    createRoute,
    updateRoute,
    deleteRoute,
    toggleRouteStatus,
  } = useTransportRouteMaster();

  const userHasAccess = useMemo(() => {
    if (!user) return false;
    const roles = ['admin', 'staff'];
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
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

  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await cityMasterAPI.getActive();
        const citiesData = response.data?.data?.cityMasters || response.data?.cityMasters || [];
        setCities(citiesData);
      } catch (error) {
        toast.error('Failed to load cities');
        console.error('Error loading cities:', error);
      }
    };
    loadCities();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[TransportRouteMaster] handleSubmit called', {
      editingRoute: editingRoute?.id,
      formData: { ...formData }
    });
    
    if (!formData.city1Id || !formData.city2Id) {
      console.log('[TransportRouteMaster] Validation failed');
      toast.error('Please fill in all required fields');
      return;
    }
    
    console.log('[TransportRouteMaster] Calling API...', editingRoute ? 'update' : 'create');
    const success = editingRoute 
      ? await updateRoute(editingRoute.id, formData)
      : await createRoute(formData);
    
    console.log('[TransportRouteMaster] API response success:', success);
    
    if (success) {
      if (editingRoute) {
        handleRouteUpdated();
      } else {
        handleRouteCreated();
      }
    }
  };

  const handleRouteCreated = () => {
    console.log('[TransportRouteMaster] handleRouteCreated called');
    setShowCreateForm(false);
    setEditingRoute(null);
    toast.success('Route created successfully!');
    setFormData({
      city1Id: '',
      city2Id: '',
      city3Id: null,
      city4Id: null,
      routeType: 'citytocity',
      isActive: true,
    });
  };

  const handleRouteUpdated = () => {
    console.log('[TransportRouteMaster] handleRouteUpdated called');
    setEditingRoute(null);
    setShowCreateForm(false);
    toast.success('Route updated successfully!');
  };

  const handleEdit = async (route: TransportRouteMaster) => {
    console.log('[TransportRouteMaster] handleEdit called', { routeId: route.id });
    setEditingRoute(route);
    setFormData({
      city1Id: route.city1Id,
      city2Id: route.city2Id,
      city3Id: route.city3Id || null,
      city4Id: route.city4Id || null,
      routeType: route.routeType,
      isActive: route.isActive,
    });
    setShowCreateForm(true);
  };

  const handleDeleteClick = (route: TransportRouteMaster) => {
    setRouteToDelete(route);
  };

  const handleDeleteConfirm = async () => {
    if (!routeToDelete) return;
    await deleteRoute(routeToDelete.id);
    setRouteToDelete(null);
  };

  const handleToggleStatus = async (route: TransportRouteMaster) => {
    await toggleRouteStatus(route);
  };

  const getRouteTypeLabel = (type: RouteType) => {
    const labels: Record<RouteType, string> = {
      citytocity: 'City to City',
      airporttocity: 'Airport to City',
      citytoairport: 'City to Airport',
      tripandtour: 'Trip and Tour',
      fulltrip: 'Full Trip',
    };
    return labels[type];
  };

  if (!mounted) {
    return null;
  }

  if (!user) {
    return null;
  }

  const stats = {
    total: routes.length,
    active: routes.filter(r => r.isActive).length,
    citytocity: routes.filter(r => r.routeType === 'citytocity').length,
    airporttocity: routes.filter(r => r.routeType === 'airporttocity').length,
    citytoairport: routes.filter(r => r.routeType === 'citytoairport').length,
    tripandtour: routes.filter(r => r.routeType === 'tripandtour').length,
    fulltrip: routes.filter(r => r.routeType === 'fulltrip').length,
  };

  return (
    <div className="flex h-screen bg-gray-50/50">
      <div className="hidden lg:block">
        <Sidebar 
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1 overflow-auto">
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Transport Route Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage transport routes between cities
                </p>
              </div>
            </div>
            
            {user && hasRole(['admin', 'staff']) && (
              <Button 
                onClick={() => {
                  setEditingRoute(null);
                  setFormData({
                    city1Id: '',
                    city2Id: '',
                    city3Id: null,
                    city4Id: null,
                    routeType: 'citytocity',
                    isActive: true,
                  });
                  setShowCreateForm(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Route
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Route className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Routes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <Route className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Route className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">City to City</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.citytocity}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Route className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Airport to City</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.airporttocity}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                    <Route className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">City to Airport</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.citytoairport}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <Route className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Trip and Tour</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.tripandtour}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
                    <Route className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Full Trip</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.fulltrip}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold">Route Management</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage transport routes between cities
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search routes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  />
                  <select
                    value={filterRouteType || ''}
                    onChange={(e) => setFilterRouteType(e.target.value as RouteType || undefined)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="citytocity">City to City</option>
                    <option value="airporttocity">Airport to City</option>
                    <option value="citytoairport">City to Airport</option>
                    <option value="tripandtour">Trip and Tour</option>
                    <option value="fulltrip">Full Trip</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filteredRoutes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No routes found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRoutes.map((route) => (
                    <TransportRouteCard
                      key={route.id}
                      route={route}
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

      <Sheet open={showCreateForm} onOpenChange={setShowCreateForm}>
        <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingRoute ? 'Edit Route' : 'Create New Route'}</SheetTitle>
            <SheetDescription>
              {editingRoute ? 'Update the transport route details' : 'Add a new transport route between cities'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <TransportRouteForm
              formData={formData}
              editingRoute={editingRoute}
              cities={cities}
              onFormDataChange={setFormData}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowCreateForm(false);
                setEditingRoute(null);
                setFormData({
                  city1Id: '',
                  city2Id: '',
                  city3Id: null,
                  city4Id: null,
                  routeType: 'citytocity',
                  isActive: true,
                });
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <TransportRouteDeleteConfirmationModal
        route={routeToDelete}
        open={!!routeToDelete}
        loading={false}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setRouteToDelete(null)}
      />
    </div>
  );
}

