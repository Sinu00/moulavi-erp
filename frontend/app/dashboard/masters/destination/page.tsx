'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getUser, hasRole } from '@/lib/auth';
import { useDestinationMaster } from '@/hooks/useDestinationMaster';
import Sidebar from '@/components/Sidebar';
import DestinationCard from '@/components/destination/DestinationCard';
import DestinationForm from '@/components/destination/DestinationForm';
import DestinationDeleteConfirmationModal from '@/components/destination/DestinationDeleteConfirmationModal';
import { Plus, Search, MapPin, Menu } from 'lucide-react';

interface DestinationMaster {
  id: string;
  destinationCode: string;
  destinationName: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateDestinationMasterRequest {
  destinationCode: string;
  destinationName: string;
  city: string;
  country: string;
  isActive?: boolean;
}

export default function DestinationMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDestination, setEditingDestination] = useState<DestinationMaster | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [destinationToDelete, setDestinationToDelete] = useState<DestinationMaster | null>(null);
  const [formData, setFormData] = useState<CreateDestinationMasterRequest>({
    destinationCode: '',
    destinationName: '',
    city: '',
    country: '',
    isActive: true
  });

  const [mounted, setMounted] = useState(false);

  const {
    destinations,
    loading,
    searchTerm,
    setSearchTerm,
    filteredDestinations,
    createDestination,
    updateDestination,
    deleteDestination,
    toggleDestinationStatus
  } = useDestinationMaster();

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
    
    const success = editingDestination 
      ? await updateDestination(editingDestination.id, formData)
      : await createDestination(formData);
    
    if (success) {
      resetForm();
    }
  };

  const handleEdit = (destination: DestinationMaster) => {
    setEditingDestination(destination);
    setFormData({
      destinationCode: destination.destinationCode,
      destinationName: destination.destinationName,
      city: destination.city,
      country: destination.country,
      isActive: destination.isActive
    });
    setShowCreateForm(true);
  };

  const handleDeleteClick = (destination: DestinationMaster) => {
    setDestinationToDelete(destination);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!destinationToDelete) return;

    const success = await deleteDestination(destinationToDelete.id);
    if (success) {
      setShowDeleteModal(false);
      setDestinationToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDestinationToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      destinationCode: '',
      destinationName: '',
      city: '',
      country: '',
      isActive: true
    });
    setEditingDestination(null);
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Destination Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage destinations for travel bookings
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
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search destinations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destinations List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Destinations ({filteredDestinations.length})
              </CardTitle>
              <CardDescription>
                Manage destination information for travel bookings
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
              ) : filteredDestinations.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No destinations found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'No destinations match your search criteria' : 'Get started by adding your first destination'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Destination
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDestinations.map((destination) => (
                    <DestinationCard
                      key={destination.id}
                      destination={destination}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      onToggleStatus={toggleDestinationStatus}
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
              {editingDestination ? 'Edit Destination' : 'Add New Destination'}
            </SheetTitle>
            <SheetDescription>
              {editingDestination ? 'Update destination information' : 'Add a new destination to the system'}
            </SheetDescription>
          </SheetHeader>
          <DestinationForm
            formData={formData}
            editingDestination={editingDestination}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <DestinationDeleteConfirmationModal
        isOpen={showDeleteModal}
        destination={destinationToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}