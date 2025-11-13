'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { pricingMasterAPI, partyAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { Plus, Menu, Search, DollarSign, Edit, Trash2, X } from 'lucide-react';
import { Party } from '@/types';

interface PricingMaster {
  id: string;
  partyId: string;
  cost: number;
  price: number;
  type: 'umrah' | 'others';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  party?: {
    id: string;
    partyName: string;
    email: string;
  };
}

interface CreatePricingMasterRequest {
  partyId: string;
  cost: number;
  price: number;
  type: 'umrah' | 'others';
  isActive?: boolean;
}

export default function PricingMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPricing, setEditingPricing] = useState<PricingMaster | null>(null);
  const [pricingList, setPricingList] = useState<PricingMaster[]>([]);
  const [filteredData, setFilteredData] = useState<PricingMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [parties, setParties] = useState<Party[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [formData, setFormData] = useState<CreatePricingMasterRequest>({
    partyId: '',
    cost: 0,
    price: 0,
    type: 'umrah',
    isActive: true,
  });
  const [mounted, setMounted] = useState(false);

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
    fetchPricingMasters();
    loadParties();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, selectedType, pricingList]);

  const loadParties = async () => {
    setLoadingParties(true);
    try {
      const response = await partyAPI.getAll({ limit: 1000 });
      setParties(response.data.parties || []);
    } catch (error) {
      console.error('Error loading parties:', error);
      toast.error('Failed to load parties');
    } finally {
      setLoadingParties(false);
    }
  };

  const fetchPricingMasters = async () => {
    try {
      setIsLoading(true);
      const response = await pricingMasterAPI.getAll({ limit: 1000 });
      const data = response.data?.data?.pricingMasters || response.data?.pricingMasters || [];
      setPricingList(data);
    } catch (error) {
      console.error('Error fetching pricing masters:', error);
      toast.error('Failed to load pricing masters');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = pricingList;

    if (selectedType !== 'all') {
      filtered = filtered.filter(p => p.type === selectedType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.party?.partyName?.toLowerCase().includes(query) ||
        p.party?.email?.toLowerCase().includes(query)
      );
    }

    setFilteredData(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.partyId || formData.cost < 0 || formData.price < 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingPricing) {
        await pricingMasterAPI.update(editingPricing.id, formData);
        toast.success('Pricing master updated successfully');
      } else {
        await pricingMasterAPI.create(formData);
        toast.success('Pricing master created successfully');
      }
      resetForm();
      fetchPricingMasters();
    } catch (error: any) {
      console.error('Error saving pricing master:', error);
      toast.error(error.response?.data?.error || 'Failed to save pricing master');
    }
  };

  const handleEdit = (pricing: PricingMaster) => {
    setEditingPricing(pricing);
    setFormData({
      partyId: pricing.partyId,
      cost: pricing.cost,
      price: pricing.price,
      type: pricing.type,
      isActive: pricing.isActive,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing master?')) {
      return;
    }

    try {
      await pricingMasterAPI.delete(id);
      toast.success('Pricing master deleted successfully');
      fetchPricingMasters();
    } catch (error: any) {
      console.error('Error deleting pricing master:', error);
      toast.error(error.response?.data?.error || 'Failed to delete pricing master');
    }
  };

  const resetForm = () => {
    setFormData({
      partyId: '',
      cost: 0,
      price: 0,
      type: 'umrah',
      isActive: true,
    });
    setEditingPricing(null);
    setShowCreateForm(false);
  };

  if (!mounted) {
    return null;
  }

  if (!user) {
    return null;
  }

  const stats = {
    total: pricingList.length,
    active: pricingList.filter(p => p.isActive).length,
    umrah: pricingList.filter(p => p.type === 'umrah').length,
    others: pricingList.filter(p => p.type === 'others').length,
  };

  return (
    <div className="flex h-screen bg-gray-50/50">
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Pricing Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">Manage pricing for parties</p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Pricing</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Pricing</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active</p>
                      <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Umrah</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.umrah}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Others</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.others}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pricing Masters</CardTitle>
                <CardDescription>Showing {filteredData.length} of {pricingList.length} pricing entries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      placeholder="Search by party name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="umrah">Umrah</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Party Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Profit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No pricing masters found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((pricing) => {
                          const profit = pricing.price - pricing.cost;
                          const profitMargin = pricing.cost > 0 ? ((profit / pricing.cost) * 100).toFixed(1) : '0';
                          return (
                            <TableRow key={pricing.id}>
                              <TableCell className="font-medium">
                                {pricing.party?.partyName || 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={pricing.type === 'umrah' ? 'default' : 'secondary'}>
                                  {pricing.type}
                                </Badge>
                              </TableCell>
                              <TableCell>₹{pricing.cost.toLocaleString('en-IN')}</TableCell>
                              <TableCell>₹{pricing.price.toLocaleString('en-IN')}</TableCell>
                              <TableCell>
                                <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  ₹{profit.toLocaleString('en-IN')} ({profitMargin}%)
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={pricing.isActive ? 'default' : 'secondary'}>
                                  {pricing.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(pricing)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(pricing.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create/Edit Form Sheet */}
      <Sheet open={showCreateForm} onOpenChange={setShowCreateForm}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingPricing ? 'Edit Pricing Master' : 'Create Pricing Master'}</SheetTitle>
            <SheetDescription>
              {editingPricing ? 'Update pricing details' : 'Add new pricing for a party'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="partyId">Party *</Label>
              <Select
                value={formData.partyId}
                onValueChange={(value) => setFormData({ ...formData, partyId: value })}
                disabled={loadingParties}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a party" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.partyName} ({party.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'umrah' | 'others') => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="umrah">Umrah</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost (₹) *</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            {formData.cost > 0 && formData.price > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-gray-600">Profit: ₹{(formData.price - formData.cost).toLocaleString('en-IN')}</div>
                <div className="text-sm text-gray-600">
                  Margin: {formData.cost > 0 ? (((formData.price - formData.cost) / formData.cost) * 100).toFixed(1) : '0'}%
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="text-sm font-normal cursor-pointer">
                Active
              </Label>
            </div>

            <SheetFooter className="gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPricing ? 'Update' : 'Create'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

