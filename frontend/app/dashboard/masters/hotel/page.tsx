'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getUser, hasRole } from '@/lib/auth';
import { useHotelMaster } from '@/hooks/useHotelMaster';
import Sidebar from '@/components/Sidebar';
import HotelCard from '@/components/hotel/HotelCard';
import HotelForm from '@/components/hotel/HotelForm';
import HotelDeleteConfirmationModal from '@/components/hotel/HotelDeleteConfirmationModal';
import { Plus, Search, Building, Menu } from 'lucide-react';

interface HotelMaster {
  id: string;
  hotelCode: string;
  hotelName: string;
  locationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: string;
    destinationName: string;
    city: string;
  };
}

interface CreateHotelMasterRequest {
  hotelCode: string;
  hotelName: string;
  locationId: string;
  isActive?: boolean;
}

export default function HotelMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelMaster | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hotelToDelete, setHotelToDelete] = useState<HotelMaster | null>(null);
  const [formData, setFormData] = useState<CreateHotelMasterRequest>({
    hotelCode: '',
    hotelName: '',
    locationId: '',
    isActive: true
  });

  const [mounted, setMounted] = useState(false);

  const {
    hotels,
    destinations,
    loading,
    searchTerm,
    setSearchTerm,
    filteredHotels,
    createHotel,
    updateHotel,
    deleteHotel,
    toggleHotelStatus
  } = useHotelMaster();

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
    
    const success = editingHotel 
      ? await updateHotel(editingHotel.id, formData)
      : await createHotel(formData);
    
    if (success) {
      resetForm();
    }
  };

  const handleEdit = (hotel: HotelMaster) => {
    setEditingHotel(hotel);
    setFormData({
      hotelCode: hotel.hotelCode,
      hotelName: hotel.hotelName,
      locationId: hotel.locationId,
      isActive: hotel.isActive
    });
    setShowCreateForm(true);
  };

  const handleDeleteClick = (hotel: HotelMaster) => {
    setHotelToDelete(hotel);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!hotelToDelete) return;

    const success = await deleteHotel(hotelToDelete.id);
    if (success) {
      setShowDeleteModal(false);
      setHotelToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setHotelToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      hotelCode: '',
      hotelName: '',
      locationId: '',
      isActive: true
    });
    setEditingHotel(null);
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
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search hotels..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hotels List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Hotels ({filteredHotels.length})
              </CardTitle>
              <CardDescription>
                Manage hotel information for accommodation bookings
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
              ) : filteredHotels.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hotels found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'No hotels match your search criteria' : 'Get started by adding your first hotel'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Hotel
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHotels.map((hotel) => (
                    <HotelCard
                      key={hotel.id}
                      hotel={hotel}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      onToggleStatus={toggleHotelStatus}
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
              {editingHotel ? 'Edit Hotel' : 'Add New Hotel'}
            </SheetTitle>
            <SheetDescription>
              {editingHotel ? 'Update hotel information' : 'Add a new hotel to the system'}
            </SheetDescription>
          </SheetHeader>
          <HotelForm
            formData={formData}
            editingHotel={editingHotel}
            destinations={destinations}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <HotelDeleteConfirmationModal
        isOpen={showDeleteModal}
        hotel={hotelToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}