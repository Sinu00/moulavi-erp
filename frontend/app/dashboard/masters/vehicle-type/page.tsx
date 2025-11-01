'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { useVehicleTypeMaster } from '@/hooks/useVehicleTypeMaster';
import Sidebar from '@/components/Sidebar';
import VehicleTypeCard from '@/components/vehicle-type/VehicleTypeCard';
import VehicleTypeForm from '@/components/vehicle-type/VehicleTypeForm';
import VehicleTypeDeleteConfirmationModal from '@/components/vehicle-type/VehicleTypeDeleteConfirmationModal';
import { Plus, Search, Menu, Car } from 'lucide-react';

interface VehicleTypeMaster {
  id: string;
  vehicleName: string;
  paxCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateVehicleTypeMasterRequest {
  vehicleName: string;
  paxCount: number;
  isActive?: boolean;
}

export default function VehicleTypeMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVehicleType, setEditingVehicleType] = useState<VehicleTypeMaster | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleTypeToDelete, setVehicleTypeToDelete] = useState<VehicleTypeMaster | null>(null);
  const [formData, setFormData] = useState<CreateVehicleTypeMasterRequest>({
    vehicleName: '',
    paxCount: 0,
    isActive: true
  });

  const [mounted, setMounted] = useState(false);

  const {
    vehicleTypes,
    loading,
    searchTerm,
    setSearchTerm,
    filteredVehicleTypes,
    createVehicleType,
    updateVehicleType,
    deleteVehicleType,
    toggleVehicleTypeStatus
  } = useVehicleTypeMaster();

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
    
    if (!formData.vehicleName || formData.paxCount <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const success = editingVehicleType 
      ? await updateVehicleType(editingVehicleType.id, formData)
      : await createVehicleType(formData);
    
    if (success) {
      resetForm();
      toast.success(editingVehicleType ? 'Vehicle type updated successfully!' : 'Vehicle type created successfully!');
    }
  };

  const handleEdit = (vehicleType: VehicleTypeMaster) => {
    setEditingVehicleType(vehicleType);
    setFormData({
      vehicleName: vehicleType.vehicleName,
      paxCount: vehicleType.paxCount,
      isActive: vehicleType.isActive
    });
    setShowCreateForm(true);
  };

  const handleDeleteClick = (vehicleType: VehicleTypeMaster) => {
    setVehicleTypeToDelete(vehicleType);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vehicleTypeToDelete) return;

    const success = await deleteVehicleType(vehicleTypeToDelete.id);
    if (success) {
      setShowDeleteModal(false);
      setVehicleTypeToDelete(null);
      toast.success('Vehicle type deleted successfully!');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setVehicleTypeToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      vehicleName: '',
      paxCount: 0,
      isActive: true
    });
    setEditingVehicleType(null);
    setShowCreateForm(false);
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  // Show loading state while checking permissions
  if (loading && vehicleTypes.length === 0 && !searchTerm) {
    return (
      <div className="flex h-screen bg-gray-50/50">
        <div className="hidden lg:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center">
          <div className="text-center">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-500">Loading vehicle types...</p>
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Vehicle Type Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage vehicle types and passenger capacities
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle Type
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
                    placeholder="Search vehicle types..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Types List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Types ({filteredVehicleTypes.length})
              </CardTitle>
              <CardDescription>
                Manage vehicle types and their passenger capacities
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
              ) : filteredVehicleTypes.length === 0 ? (
                <div className="text-center py-12">
                  <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicle types found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'No vehicle types match your search criteria' : 'Get started by adding your first vehicle type'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vehicle Type
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredVehicleTypes.map((vehicleType) => (
                    <VehicleTypeCard
                      key={vehicleType.id}
                      vehicleType={vehicleType}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      onToggleStatus={toggleVehicleTypeStatus}
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
              {editingVehicleType ? 'Edit Vehicle Type' : 'Add New Vehicle Type'}
            </SheetTitle>
            <SheetDescription>
              {editingVehicleType ? 'Update vehicle type information' : 'Add a new vehicle type to the system'}
            </SheetDescription>
          </SheetHeader>
          <VehicleTypeForm
            formData={formData}
            editingVehicleType={editingVehicleType}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <VehicleTypeDeleteConfirmationModal
        isOpen={showDeleteModal}
        vehicleType={vehicleTypeToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

