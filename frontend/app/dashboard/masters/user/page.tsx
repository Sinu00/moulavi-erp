'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import UserTable from '@/components/UserTable';
import CreateUserDialog from '@/components/CreateUserDialog';
import { useUsers } from '@/hooks/useUsers';
import { User, CreateUserRequest } from '@/types';
import { Plus, Menu, Users as UsersIcon } from 'lucide-react';

export default function UserMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const { users, loading, error, createUser, updateUser, deleteUser } = useUsers();
  
  // CRITICAL: Always check authentication first
  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/auth');
      return;
    }
  }, [user, router]);

  if (!user) {
    return null; // Prevent flash of content
  }

  const handleCreateUser = async (userData: CreateUserRequest) => {
    await createUser(userData);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setCreateDialogOpen(true);
  };

  const handleUpdateUser = async (userData: CreateUserRequest) => {
    if (!editingUser) return;
    await updateUser(editingUser.id, userData);
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteUser(userId);
        toast.success('User deleted successfully');
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setEditingUser(null);
  };

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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">User Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage system users and their permissions
                </p>
              </div>
            </div>
            
            {hasRole(['admin']) && (
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                size="sm"
              >
                <Plus className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Add New User</span>
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {users.filter(u => u.isActive).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Admin Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {users.filter(u => u.role === 'admin').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Users</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Manage all system users and their access levels
              </p>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-12">
                  <div className="text-red-500 mb-4">
                    <UsersIcon className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-lg font-medium">Error loading users</p>
                    <p className="text-sm">{error}</p>
                  </div>
                  <Button onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <UserTable
                  users={users}
                  loading={loading}
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                  onSearch={(search) => {
                    // Search is handled by the useUsers hook
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit User Dialog */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
        editingUser={editingUser}
        title={editingUser ? 'Edit User' : 'Create New User'}
      />
    </div>
  );
}
