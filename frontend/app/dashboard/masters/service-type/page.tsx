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
import { serviceTypeMasterAPI } from '@/lib/api';
import { ServiceTypeMaster, CreateServiceTypeMasterRequest, UpdateServiceTypeMasterRequest } from '@/types';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Settings, Menu } from 'lucide-react';

export default function ServiceTypeMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState<ServiceTypeMaster | null>(null);
  const [formData, setFormData] = useState<CreateServiceTypeMasterRequest>({
    serviceCode: '',
    serviceName: '',
    category: undefined,
    description: ''
  });

  const categories = [
    'Visa', 'Travel', 'Accommodation', 'Transportation', 'Religious', 
    'Support', 'Premium', 'Emergency', 'Document', 'Financial'
  ];

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      loadServiceTypes();
    }
  }, []);

  const loadServiceTypes = async () => {
    try {
      setLoading(true);
      const response = await serviceTypeMasterAPI.getAll({ limit: 1000 });
      setServiceTypes(response.data.serviceTypeMasters || []);
    } catch (error) {
      toast.error('Failed to load service types');
      console.error('Error loading service types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingServiceType) {
        await serviceTypeMasterAPI.update(editingServiceType.id, formData);
        toast.success('Service type updated successfully');
      } else {
        await serviceTypeMasterAPI.create(formData);
        toast.success('Service type created successfully');
      }
      setShowCreateForm(false);
      setEditingServiceType(null);
      setFormData({
        serviceCode: '',
        serviceName: '',
        category: undefined,
        description: ''
      });
      loadServiceTypes();
    } catch (error) {
      toast.error('Failed to save service type');
      console.error('Error saving service type:', error);
    }
  };

  const handleEdit = (serviceType: ServiceTypeMaster) => {
    setEditingServiceType(serviceType);
    setFormData({
      serviceCode: serviceType.serviceCode,
      serviceName: serviceType.serviceName,
      category: serviceType.category,
      description: serviceType.description || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service type?')) return;
    try {
      await serviceTypeMasterAPI.delete(id);
      toast.success('Service type deleted successfully');
      loadServiceTypes();
    } catch (error) {
      toast.error('Failed to delete service type');
      console.error('Error deleting service type:', error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await serviceTypeMasterAPI.toggleStatus(id);
      toast.success('Service type status updated');
      loadServiceTypes();
    } catch (error) {
      toast.error('Failed to update service type status');
      console.error('Error updating service type status:', error);
    }
  };

  const filteredServiceTypes = serviceTypes.filter(serviceType => {
    const matchesSearch = serviceType.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         serviceType.serviceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         serviceType.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || serviceType.category === selectedCategory;
    return matchesSearch && matchesCategory;
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
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Service Type Master</h1>
                  <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                    Manage service types and categories
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Service Type
              </Button>
            </div>
          </div>

          <div className="p-4 lg:p-8 space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Service Types</CardTitle>
                <CardDescription>
                  Manage service types and their categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search service types..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Service Type Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage service types for booking system
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Service Type
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
                placeholder="Search service types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
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
            <CardTitle>{editingServiceType ? 'Edit Service Type' : 'Create New Service Type'}</CardTitle>
            <CardDescription>
              {editingServiceType ? 'Update service type information' : 'Add a new service type to the system'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceCode">Service Code *</Label>
                  <Input
                    id="serviceCode"
                    value={formData.serviceCode}
                    onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value })}
                    placeholder="e.g., UMRAH_VISA, HOTEL_BOOKING"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceName">Service Name *</Label>
                  <Input
                    id="serviceName"
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    placeholder="e.g., Umrah Visa, Hotel Booking"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category || ''} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
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
                    setEditingServiceType(null);
                    setFormData({
                      serviceCode: '',
                      serviceName: '',
                      category: undefined,
                      description: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingServiceType ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Service Types List */}
      <div className="grid gap-4">
        {filteredServiceTypes.map((serviceType) => (
          <Card key={serviceType.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <Settings className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{serviceType.serviceName}</h3>
                    <p className="text-sm text-gray-600">{serviceType.category}</p>
                    <p className="text-xs text-gray-500">Code: {serviceType.serviceCode}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={serviceType.isActive ? 'default' : 'secondary'}>
                    {serviceType.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(serviceType.id)}
                  >
                    {serviceType.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(serviceType)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(serviceType.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {serviceType.description && (
                <div className="mt-3 text-sm text-gray-600">
                  {serviceType.description}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServiceTypes.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No service types found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory ? 'Try adjusting your search terms' : 'Get started by creating your first service type'}
            </p>
            {!searchTerm && !selectedCategory && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service Type
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
