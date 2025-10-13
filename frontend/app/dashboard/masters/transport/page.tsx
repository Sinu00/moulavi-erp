'use client';

import { useEffect, useState } from 'react';
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
import { Plus, Menu, Edit, Trash2, Eye, EyeOff, Truck } from 'lucide-react';
import { transportMasterAPI } from '@/lib/api';
import { TransportMaster, CreateTransportMasterRequest, UpdateTransportMasterRequest } from '@/types';

export default function TransportMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [transportMasters, setTransportMasters] = useState<TransportMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTransport, setEditingTransport] = useState<TransportMaster | null>(null);
  const [formData, setFormData] = useState<CreateTransportMasterRequest>({
    vehicleType: '',
    vehicleRoute: '',
    pax: 0,
    price: 0,
    description: ''
  });

  // CRITICAL: Always check authentication first
  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      loadTransportMasters();
    }
  }, [search]);

  const loadTransportMasters = async () => {
    setLoading(true);
    try {
      const response = await transportMasterAPI.getAll({ search, limit: 1000 });
      setTransportMasters(response.data.transportMasters);
    } catch (error) {
      console.error('Error loading transport masters:', error);
      toast.error('Failed to load transport masters');
      setTransportMasters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await transportMasterAPI.toggleStatus(id);
      toast.success('Status updated successfully');
      loadTransportMasters();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTransport) {
        await transportMasterAPI.update(editingTransport.id, formData);
        toast.success('Transport updated successfully');
      } else {
        await transportMasterAPI.create(formData);
        toast.success('Transport created successfully');
      }
      setShowCreateForm(false);
      setEditingTransport(null);
      setFormData({
        vehicleType: '',
        vehicleRoute: '',
        pax: 0,
        price: 0,
        description: ''
      });
      loadTransportMasters();
    } catch (error) {
      toast.error('Failed to save transport');
      console.error('Error saving transport:', error);
    }
  };

  const handleEdit = (transport: TransportMaster) => {
    setEditingTransport(transport);
    setFormData({
      vehicleType: transport.vehicleType,
      vehicleRoute: transport.vehicleRoute,
      pax: transport.pax,
      price: transport.price,
      description: transport.description || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transport master?')) {
      return;
    }

    try {
      await transportMasterAPI.delete(id);
      toast.success('Transport master deleted successfully');
      loadTransportMasters();
    } catch (error) {
      console.error('Error deleting transport master:', error);
      toast.error('Failed to delete transport master');
    }
  };

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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Transport Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage transport options and pricing
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              size="sm"
            >
              <Plus className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Add New Transport</span>
            </Button>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Search */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search by route or vehicle type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Create/Edit Form */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingTransport ? 'Edit Transport' : 'Create New Transport'}</CardTitle>
                <CardDescription>
                  {editingTransport ? 'Update transport information' : 'Add a new transport option to the system'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleType">Vehicle Type *</Label>
                      <Input
                        id="vehicleType"
                        value={formData.vehicleType}
                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                        placeholder="e.g., Bus, Car, Van"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleRoute">Vehicle Route *</Label>
                      <Input
                        id="vehicleRoute"
                        value={formData.vehicleRoute}
                        onChange={(e) => setFormData({ ...formData, vehicleRoute: e.target.value })}
                        placeholder="e.g., Jeddah to Makkah"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pax">Passenger Capacity *</Label>
                      <Input
                        id="pax"
                        type="number"
                        value={formData.pax}
                        onChange={(e) => setFormData({ ...formData, pax: parseInt(e.target.value) || 0 })}
                        placeholder="e.g., 50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (SAR) *</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g., 100"
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
                        setEditingTransport(null);
                        setFormData({
                          vehicleType: '',
                          vehicleRoute: '',
                          pax: 0,
                          price: 0,
                          description: ''
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingTransport ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Transport Masters List */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Transport Options</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {transportMasters.length} transport options found
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : transportMasters.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No transport options found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transportMasters.map((transport) => (
                    <div
                      key={transport.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {transport.pax}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {transport.vehicleType}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {transport.vehicleRoute} • {transport.pax} PAX
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-green-600">
                            SAR {transport.price}
                          </p>
                          <div className="flex items-center space-x-1">
                            {transport.isActive ? (
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                Active
                              </span>
                            ) : (
                              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(transport.id)}
                        >
                          {transport.isActive ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(transport)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(transport.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
