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
import { currencyMasterAPI } from '@/lib/api';
import { CurrencyMaster, CreateCurrencyMasterRequest, UpdateCurrencyMasterRequest } from '@/types';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, DollarSign, Menu } from 'lucide-react';

export default function CurrencyMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyMaster | null>(null);
  const [formData, setFormData] = useState<CreateCurrencyMasterRequest>({
    currencyCode: '',
    currencyName: '',
    symbol: '',
    description: ''
  });

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      loadCurrencies();
    }
  }, []);

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      const response = await currencyMasterAPI.getAll({ limit: 1000 });
      setCurrencies(response.data.currencyMasters || []);
    } catch (error) {
      toast.error('Failed to load currencies');
      console.error('Error loading currencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCurrency) {
        await currencyMasterAPI.update(editingCurrency.id, formData);
        toast.success('Currency updated successfully');
      } else {
        await currencyMasterAPI.create(formData);
        toast.success('Currency created successfully');
      }
      setShowCreateForm(false);
      setEditingCurrency(null);
      setFormData({
        currencyCode: '',
        currencyName: '',
        symbol: '',
        description: ''
      });
      loadCurrencies();
    } catch (error) {
      toast.error('Failed to save currency');
      console.error('Error saving currency:', error);
    }
  };

  const handleEdit = (currency: CurrencyMaster) => {
    setEditingCurrency(currency);
    setFormData({
      currencyCode: currency.currencyCode,
      currencyName: currency.currencyName,
      symbol: currency.symbol,
      description: currency.description || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this currency?')) return;
    try {
      await currencyMasterAPI.delete(id);
      toast.success('Currency deleted successfully');
      loadCurrencies();
    } catch (error) {
      toast.error('Failed to delete currency');
      console.error('Error deleting currency:', error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await currencyMasterAPI.toggleStatus(id);
      toast.success('Currency status updated');
      loadCurrencies();
    } catch (error) {
      toast.error('Failed to update currency status');
      console.error('Error updating currency status:', error);
    }
  };

  const filteredCurrencies = currencies.filter(currency =>
    currency.currencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.currencyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Currency Master</h1>
                  <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                    Manage currencies and exchange rates
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Currency
              </Button>
            </div>
          </div>

          <div className="p-4 lg:p-8 space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Currencies</CardTitle>
                <CardDescription>
                  Manage currencies and their information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search currencies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Currency Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage currencies and symbols
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Currency
            </Button>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search currencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Create/Edit Form */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingCurrency ? 'Edit Currency' : 'Create New Currency'}</CardTitle>
                <CardDescription>
                  {editingCurrency ? 'Update currency information' : 'Add a new currency to the system'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currencyCode">Currency Code *</Label>
                      <Input
                        id="currencyCode"
                        value={formData.currencyCode}
                        onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                        placeholder="e.g., SAR, USD, AED"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currencyName">Currency Name *</Label>
                      <Input
                        id="currencyName"
                        value={formData.currencyName}
                        onChange={(e) => setFormData({ ...formData, currencyName: e.target.value })}
                        placeholder="e.g., Saudi Riyal, US Dollar, UAE Dirham"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="symbol">Symbol *</Label>
                      <Input
                        id="symbol"
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                        placeholder="e.g., ﷼, $, د.إ"
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
                        setEditingCurrency(null);
                        setFormData({
                          currencyCode: '',
                          currencyName: '',
                          symbol: '',
                          description: ''
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingCurrency ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Currencies List */}
          <div className="grid gap-4">
            {filteredCurrencies.map((currency) => (
              <Card key={currency.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{currency.currencyName}</h3>
                        <p className="text-sm text-gray-600">Symbol: {currency.symbol}</p>
                        <p className="text-xs text-gray-500">Code: {currency.currencyCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={currency.isActive ? 'default' : 'secondary'}>
                        {currency.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(currency.id)}
                      >
                        {currency.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(currency)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(currency.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {currency.description && (
                    <div className="mt-3 text-sm text-gray-600">
                      {currency.description}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCurrencies.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No currencies found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first currency'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Currency
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
