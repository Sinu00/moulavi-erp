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
import { userRoleMasterAPI } from '@/lib/api';
import { UserRoleMaster, CreateUserRoleMasterRequest, UpdateUserRoleMasterRequest } from '@/types';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Shield, Menu } from 'lucide-react';

export default function UserRoleMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRoleMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserRole, setEditingUserRole] = useState<UserRoleMaster | null>(null);
  const [formData, setFormData] = useState<CreateUserRoleMasterRequest>({
    roleCode: '',
    roleName: '',
    permissions: [],
    description: ''
  });
  const [newPermission, setNewPermission] = useState('');

  const commonPermissions = [
    'user_mgmt', 'party_mgmt', 'service_mgmt', 'master_mgmt', 'reporting',
    'sys_config', 'audit_logs', 'booking_mgmt', 'doc_mgmt', 'basic_reports',
    'view_bookings', 'create_bookings', 'upload_docs', 'view_invoices',
    'update_profile', 'transport_mgmt', 'accommodation_mgmt', 'financial_reports',
    'invoice_mgmt', 'payment_mgmt', 'financial_analytics', 'budget_mgmt'
  ];

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      loadUserRoles();
    }
  }, []);

  const loadUserRoles = async () => {
    try {
      setLoading(true);
      const response = await userRoleMasterAPI.getAll({ limit: 1000 });
      setUserRoles(response.data.userRoleMasters || []);
    } catch (error) {
      toast.error('Failed to load user roles');
      console.error('Error loading user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserRole) {
        await userRoleMasterAPI.update(editingUserRole.id, formData);
        toast.success('User role updated successfully');
      } else {
        await userRoleMasterAPI.create(formData);
        toast.success('User role created successfully');
      }
      setShowCreateForm(false);
      setEditingUserRole(null);
      setFormData({
        roleCode: '',
        roleName: '',
        permissions: [],
        description: ''
      });
      loadUserRoles();
    } catch (error) {
      toast.error('Failed to save user role');
      console.error('Error saving user role:', error);
    }
  };

  const handleEdit = (userRole: UserRoleMaster) => {
    setEditingUserRole(userRole);
    setFormData({
      roleCode: userRole.roleCode,
      roleName: userRole.roleName,
      permissions: userRole.permissions,
      description: userRole.description || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user role?')) return;
    try {
      await userRoleMasterAPI.delete(id);
      toast.success('User role deleted successfully');
      loadUserRoles();
    } catch (error) {
      toast.error('Failed to delete user role');
      console.error('Error deleting user role:', error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await userRoleMasterAPI.toggleStatus(id);
      toast.success('User role status updated');
      loadUserRoles();
    } catch (error) {
      toast.error('Failed to update user role status');
      console.error('Error updating user role status:', error);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permission]
      });
    } else {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p !== permission)
      });
    }
  };

  const addCustomPermission = () => {
    if (newPermission.trim() && !formData.permissions.includes(newPermission.trim())) {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, newPermission.trim()]
      });
      setNewPermission('');
    }
  };

  const removePermission = (permission: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.filter(p => p !== permission)
    });
  };

  const filteredUserRoles = userRoles.filter(userRole =>
    userRole.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    userRole.roleCode.toLowerCase().includes(searchTerm.toLowerCase())
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
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">User Role Master</h1>
                  <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                    Manage user roles and permissions
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add User Role
              </Button>
            </div>
          </div>

          <div className="p-4 lg:p-8 space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">User Roles</CardTitle>
                <CardDescription>
                  Manage user roles and their permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search user roles..."
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">User Role Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage user roles and permissions
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add User Role
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
              placeholder="Search user roles..."
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
            <CardTitle>{editingUserRole ? 'Edit User Role' : 'Create New User Role'}</CardTitle>
            <CardDescription>
              {editingUserRole ? 'Update user role information' : 'Add a new user role to the system'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roleCode">Role Code *</Label>
                  <Input
                    id="roleCode"
                    value={formData.roleCode}
                    onChange={(e) => setFormData({ ...formData, roleCode: e.target.value })}
                    placeholder="e.g., ADMIN, STAFF, PARTY"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleName">Role Name *</Label>
                  <Input
                    id="roleName"
                    value={formData.roleName}
                    onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                    placeholder="e.g., Administrator, Staff Member"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {commonPermissions.map((permission) => (
                    <label key={permission} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission)}
                        onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">{permission}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Input
                    placeholder="Add custom permission"
                    value={newPermission}
                    onChange={(e) => setNewPermission(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomPermission())}
                  />
                  <Button type="button" onClick={addCustomPermission} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.permissions.map((permission) => (
                    <Badge key={permission} variant="outline" className="text-xs">
                      {permission}
                      <button
                        type="button"
                        onClick={() => removePermission(permission)}
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
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
                    setEditingUserRole(null);
                    setFormData({
                      roleCode: '',
                      roleName: '',
                      permissions: [],
                      description: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUserRole ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* User Roles List */}
      <div className="grid gap-4">
        {filteredUserRoles.map((userRole) => (
          <Card key={userRole.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                    <Shield className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{userRole.roleName}</h3>
                    <p className="text-sm text-gray-600">Code: {userRole.roleCode}</p>
                    <p className="text-xs text-gray-500">
                      {userRole.permissions.length} permission{userRole.permissions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={userRole.isActive ? 'default' : 'secondary'}>
                    {userRole.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(userRole.id)}
                  >
                    {userRole.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(userRole)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(userRole.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {userRole.permissions.slice(0, 5).map((permission) => (
                  <Badge key={permission} variant="outline" className="text-xs">
                    {permission}
                  </Badge>
                ))}
                {userRole.permissions.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{userRole.permissions.length - 5} more
                  </Badge>
                )}
              </div>
              {userRole.description && (
                <div className="mt-3 text-sm text-gray-600">
                  {userRole.description}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUserRoles.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No user roles found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first user role'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add User Role
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
