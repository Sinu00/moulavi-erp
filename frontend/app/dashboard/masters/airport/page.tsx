'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getUser, hasRole } from '@/lib/auth';
import { useAirportMaster } from '@/hooks/useAirportMaster';
import Sidebar from '@/components/Sidebar';
import AirportCard from '@/components/airport/AirportCard';
import AirportForm from '@/components/airport/AirportForm';
import AirportDeleteConfirmationModal from '@/components/airport/AirportDeleteConfirmationModal';
import { Plus, Search, Plane, Menu } from 'lucide-react';

interface AirportMaster {
  id: string;
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateAirportMasterRequest {
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  isActive?: boolean;
}

export default function AirportMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAirport, setEditingAirport] = useState<AirportMaster | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [airportToDelete, setAirportToDelete] = useState<AirportMaster | null>(null);
  const [formData, setFormData] = useState<CreateAirportMasterRequest>({
    airportCode: '',
    airportName: '',
    city: '',
    country: '',
    isActive: true
  });

  const [mounted, setMounted] = useState(false);

  const {
    airports,
    loading,
    searchTerm,
    setSearchTerm,
    filteredAirports,
    createAirport,
    updateAirport,
    deleteAirport,
    toggleAirportStatus
  } = useAirportMaster();

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
    
    const success = editingAirport 
      ? await updateAirport(editingAirport.id, formData)
      : await createAirport(formData);
    
    if (success) {
      resetForm();
    }
  };

  const handleEdit = (airport: AirportMaster) => {
    setEditingAirport(airport);
    setFormData({
      airportCode: airport.airportCode,
      airportName: airport.airportName,
      city: airport.city,
      country: airport.country,
      isActive: airport.isActive
    });
    setShowCreateForm(true);
  };

  const handleDeleteClick = (airport: AirportMaster) => {
    setAirportToDelete(airport);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!airportToDelete) return;

    const success = await deleteAirport(airportToDelete.id);
    if (success) {
      setShowDeleteModal(false);
      setAirportToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setAirportToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      airportCode: '',
      airportName: '',
      city: '',
      country: '',
      isActive: true
    });
    setEditingAirport(null);
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Airport Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage airports for travel bookings
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Airport
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
                    placeholder="Search airports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Airports List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Airports ({filteredAirports.length})
              </CardTitle>
              <CardDescription>
                Manage airport information for travel bookings
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
              ) : filteredAirports.length === 0 ? (
                <div className="text-center py-12">
                  <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No airports found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'No airports match your search criteria' : 'Get started by adding your first airport'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Airport
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAirports.map((airport) => (
                    <AirportCard
                      key={airport.id}
                      airport={airport}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      onToggleStatus={toggleAirportStatus}
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
              {editingAirport ? 'Edit Airport' : 'Add New Airport'}
            </SheetTitle>
            <SheetDescription>
              {editingAirport ? 'Update airport information' : 'Add a new airport to the system'}
            </SheetDescription>
          </SheetHeader>
          <AirportForm
            formData={formData}
            editingAirport={editingAirport}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <AirportDeleteConfirmationModal
        isOpen={showDeleteModal}
        airport={airportToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
