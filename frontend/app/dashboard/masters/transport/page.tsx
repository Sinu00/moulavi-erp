'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getUser, hasRole } from '@/lib/auth';
import { useTransportMaster } from '@/hooks/useTransportMaster';
import Sidebar from '@/components/Sidebar';
import TransportCard from '@/components/transport/TransportCard';
import TransportForm from '@/components/transport/TransportForm';
import TransportDeleteConfirmationModal from '@/components/transport/TransportDeleteConfirmationModal';
import { Plus, Search, Truck, Menu } from 'lucide-react';

interface TransportMaster {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  vehicleType: string;
  paxCount: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fromLocation?: {
    id: string;
    destinationName: string;
    city: string;
  };
  toLocation?: {
    id: string;
    destinationName: string;
    city: string;
  };
}

interface CreateTransportMasterRequest {
  fromLocationId: string;
  toLocationId: string;
  vehicleType: string;
  paxCount: number;
  price: number;
  isActive?: boolean;
}

export default function TransportMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTransport, setEditingTransport] = useState<TransportMaster | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transportToDelete, setTransportToDelete] = useState<TransportMaster | null>(null);
  const [formData, setFormData] = useState<CreateTransportMasterRequest>({
    fromLocationId: '',
    toLocationId: '',
    vehicleType: '',
    paxCount: 0,
    price: 0,
    isActive: true
  });

  const [mounted, setMounted] = useState(false);

  const {
    transports,
    destinations,
    loading,
    searchTerm,
    setSearchTerm,
    filteredTransports,
    createTransport,
    updateTransport,
    deleteTransport,
    toggleTransportStatus
  } = useTransportMaster();

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
    
    const success = editingTransport 
      ? await updateTransport(editingTransport.id, formData)
      : await createTransport(formData);
    
    if (success) {
      resetForm();
    }
  };

  const handleEdit = (transport: TransportMaster) => {
    setEditingTransport(transport);
    setFormData({
      fromLocationId: transport.fromLocationId,
      toLocationId: transport.toLocationId,
      vehicleType: transport.vehicleType,
      paxCount: transport.paxCount,
      price: transport.price,
      isActive: transport.isActive
    });
    setShowCreateForm(true);
  };

  const handleDeleteClick = (transport: TransportMaster) => {
    setTransportToDelete(transport);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transportToDelete) return;

    const success = await deleteTransport(transportToDelete.id);
    if (success) {
      setShowDeleteModal(false);
      setTransportToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setTransportToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      fromLocationId: '',
      toLocationId: '',
      vehicleType: '',
      paxCount: 0,
      price: 0,
      isActive: true
    });
    setEditingTransport(null);
    setShowCreateForm(false);
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
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
                  Manage transport routes and pricing
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Transport Route
            </Button>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search transport routes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transport Routes List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Transport Routes ({filteredTransports.length})
              </CardTitle>
              <CardDescription>
                Manage transport routes and pricing for travel bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredTransports.length === 0 ? (
                <div className="text-center py-12">
                  <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transport routes found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'No transport routes match your search criteria' : 'Get started by adding your first transport route'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transport Route
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransports.map((transport) => (
                    <TransportCard
                      key={transport.id}
                      transport={transport}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      onToggleStatus={toggleTransportStatus}
                    />
                  ))}
                </div>
              )}
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
              {editingTransport ? 'Edit Transport Route' : 'Add New Transport Route'}
            </SheetTitle>
            <SheetDescription>
              {editingTransport ? 'Update transport route information' : 'Add a new transport route to the system'}
            </SheetDescription>
          </SheetHeader>
          <TransportForm
            formData={formData}
            editingTransport={editingTransport}
            destinations={destinations}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <TransportDeleteConfirmationModal
        isOpen={showDeleteModal}
        transport={transportToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}