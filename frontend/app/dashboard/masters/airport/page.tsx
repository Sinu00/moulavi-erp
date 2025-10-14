'use client';

import { useState, useEffect } from 'react';
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
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Plane, Menu } from 'lucide-react';

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
}

export default function AirportMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [airports, setAirports] = useState<AirportMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAirport, setEditingAirport] = useState<AirportMaster | null>(null);
  const [formData, setFormData] = useState<CreateAirportMasterRequest>({
    airportCode: '',
    airportName: '',
    city: '',
    country: ''
  });

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      loadAirports();
    }
  }, []);

  const loadAirports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/airport-masters', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setAirports(data.airports || []);
    } catch (error) {
      toast.error('Failed to load airports');
      console.error('Error loading airports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingAirport 
        ? `/api/airport-masters/${editingAirport.id}`
        : '/api/airport-masters';
      
      const method = editingAirport ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingAirport ? 'Airport updated successfully' : 'Airport created successfully');
        loadAirports();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save airport');
      }
    } catch (error) {
      toast.error('Failed to save airport');
      console.error('Error saving airport:', error);
    }
  };

  const handleEdit = (airport: AirportMaster) => {
    setEditingAirport(airport);
    setFormData({
      airportCode: airport.airportCode,
      airportName: airport.airportName,
      city: airport.city,
      country: airport.country
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (airport: AirportMaster) => {
    if (!confirm(`Are you sure you want to delete ${airport.airportName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/airport-masters/${airport.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast.success('Airport deleted successfully');
        loadAirports();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete airport');
      }
    } catch (error) {
      toast.error('Failed to delete airport');
      console.error('Error deleting airport:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      airportCode: '',
      airportName: '',
      city: '',
      country: ''
    });
    setEditingAirport(null);
    setShowCreateForm(false);
  };

  const filteredAirports = airports.filter(airport =>
    airport.airportCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.airportName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                    <div key={airport.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <Plane className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{airport.airportName}</h3>
                          <p className="text-sm text-gray-500">
                            {airport.airportCode} • {airport.city}, {airport.country}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={airport.isActive ? "default" : "secondary"}>
                          {airport.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(airport)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(airport)}
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

      {/* Create/Edit Form */}
      <Sheet open={showCreateForm} onOpenChange={setShowCreateForm}>
        <SheetContent side="right" className="w-96">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">
                {editingAirport ? 'Edit Airport' : 'Add New Airport'}
              </h2>
              <p className="text-sm text-gray-500">
                {editingAirport ? 'Update airport information' : 'Enter airport details'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="airportCode">Airport Code *</Label>
                <Input
                  id="airportCode"
                  placeholder="e.g., JED"
                  value={formData.airportCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, airportCode: e.target.value.toUpperCase() }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="airportName">Airport Name *</Label>
                <Input
                  id="airportName"
                  placeholder="e.g., King Abdulaziz International Airport"
                  value={formData.airportName}
                  onChange={(e) => setFormData(prev => ({ ...prev, airportName: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="e.g., Jeddah"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  placeholder="e.g., Saudi Arabia"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  required
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingAirport ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
