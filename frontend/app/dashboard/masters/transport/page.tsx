'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { useTransportMaster } from '@/hooks/useTransportMaster';
import Sidebar from '@/components/Sidebar';
import TransportForm from '@/components/transport/TransportForm';
import TransportCard from '@/components/transport/TransportCard';
import TransportDeleteConfirmationModal from '@/components/transport/TransportDeleteConfirmationModal';
import { transportRouteMasterAPI, vehicleTypeMasterAPI } from '@/lib/api';
import { Plus, Menu, Truck } from 'lucide-react';
import { TransportMaster, CreateTransportMasterRequest } from '@/types';

export default function TransportMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTransport, setEditingTransport] = useState<TransportMaster | null>(null);
  const [transportToDelete, setTransportToDelete] = useState<TransportMaster | null>(null);
  const [formData, setFormData] = useState<CreateTransportMasterRequest>({
    routeId: '',
    vehicleTypeId: '',
    price: 0,
    isActive: true,
  });
  const [mounted, setMounted] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);

  const {
    transports,
    loading,
    searchTerm,
    setSearchTerm,
    filteredTransports,
    createTransport,
    updateTransport,
    deleteTransport,
    toggleTransportStatus,
  } = useTransportMaster();

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
    const loadData = async () => {
      try {
        const [routesResponse, vehicleTypesResponse] = await Promise.all([
          transportRouteMasterAPI.getActive(),
          vehicleTypeMasterAPI.getActive(),
        ]);
        const routesData = routesResponse.data?.transportRouteMasters || routesResponse.data?.data?.transportRouteMasters || [];
        const vehicleTypesData = vehicleTypesResponse.data?.data?.vehicleTypeMasters || vehicleTypesResponse.data?.vehicleTypeMasters || [];
        setRoutes(routesData);
        setVehicleTypes(vehicleTypesData);
      } catch (error) {
        toast.error('Failed to load data');
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.routeId || !formData.vehicleTypeId || formData.price <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const success = editingTransport 
      ? await updateTransport(editingTransport.id, formData)
      : await createTransport(formData);
    
    if (success) {
      setShowCreateForm(false);
      setEditingTransport(null);
      setFormData({
        routeId: '',
        vehicleTypeId: '',
        price: 0,
        isActive: true,
      });
    }
  };

  const handleEdit = (transport: TransportMaster) => {
    setEditingTransport(transport);
    setFormData({
      routeId: transport.routeId,
      vehicleTypeId: transport.vehicleTypeId,
      price: transport.price,
      isActive: transport.isActive,
    });
    setShowCreateForm(true);
  };

  const handleDeleteClick = (transport: TransportMaster) => {
    setTransportToDelete(transport);
  };

  const handleDeleteConfirm = async () => {
    if (!transportToDelete) return;
    await deleteTransport(transportToDelete.id);
    setTransportToDelete(null);
  };

  const handleToggleStatus = async (transport: TransportMaster) => {
    await toggleTransportStatus(transport);
  };

  if (!mounted) {
    return null;
  }

  if (!user) {
    return null;
  }

  const stats = {
    total: transports.length,
    active: transports.filter(t => t.isActive).length,
    inactive: transports.filter(t => !t.isActive).length,
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Transport Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage transport pricing for routes and vehicle types
                </p>
              </div>
            </div>
            
            {user && hasRole(['admin', 'staff']) && (
              <Button 
                onClick={() => {
                  setEditingTransport(null);
                  setFormData({
                    routeId: '',
                    vehicleTypeId: '',
                    price: 0,
                    isActive: true,
                  });
                  setShowCreateForm(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Transport
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transports</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <Truck className="h-5 w-5" />
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
                  <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Inactive</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold">Transport Management</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage transport pricing for routes and vehicle types
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search transports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filteredTransports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No transports found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTransports.map((transport) => (
                    <TransportCard
                      key={transport.id}
                      transport={transport}
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
            <SheetTitle>{editingTransport ? 'Edit Transport' : 'Create New Transport'}</SheetTitle>
            <SheetDescription>
              {editingTransport ? 'Update the transport details' : 'Add a new transport pricing'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <TransportForm
              formData={formData}
              editingTransport={editingTransport}
              routes={routes}
              vehicleTypes={vehicleTypes}
              onFormDataChange={setFormData}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowCreateForm(false);
                setEditingTransport(null);
                setFormData({
                  routeId: '',
                  vehicleTypeId: '',
                  price: 0,
                  isActive: true,
                });
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <TransportDeleteConfirmationModal
        transport={transportToDelete}
        open={!!transportToDelete}
        loading={false}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setTransportToDelete(null)}
      />
    </div>
  );
}

