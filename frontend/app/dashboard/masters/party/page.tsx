'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import PartyStatsCards from '@/components/PartyStatsCards';
import PartyTable from '@/components/PartyTable';
import CreatePartyDialog from '@/components/CreatePartyDialog';
import { useParties } from '@/hooks/useParties';
import { Plus, Menu, Trash2, Download } from 'lucide-react';

export default function PartyMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use custom hook for party management
  const {
    parties,
    loading,
    search,
    page,
    pagination,
    selectedParties,
    filterType,
    handleSearchChange,
    handleFilterChange,
    handlePageChange,
    handleSelectParty,
    handleSelectAll,
    handleBulkDelete,
    handlePartyDeleted,
    refreshParties,
  } = useParties();

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/auth');
      return;
    }
  }, [user, router]);

  const handlePartyCreated = () => {
    setShowCreateDialog(false);
    refreshParties();
    toast.success('Party created successfully!');
  };

  const handleBulkDeleteClick = async () => {
    if (selectedParties.length === 0) {
      toast.error('Please select parties to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedParties.length} party(ies)? This action cannot be undone.`)) {
      return;
    }

    const success = await handleBulkDelete();
    if (success) {
      toast.success(`${selectedParties.length} party(ies) deleted successfully!`);
    }
  };

  if (!user) {
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
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Party Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage all party/client information
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              size="sm"
            >
              <Plus className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Add New Party</span>
            </Button>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Stats Cards */}
          <PartyStatsCards 
            parties={parties}
            pagination={pagination}
            loading={loading}
          />

          {/* Party Management */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold">Party Management</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage all your clients and business partners
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedParties.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDeleteClick}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedParties.length})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info('Export functionality coming soon')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PartyTable
                parties={parties}
                loading={loading}
                pagination={pagination}
                search={search}
                filterType={filterType}
                selectedParties={selectedParties}
                onSearchChange={handleSearchChange}
                onFilterChange={handleFilterChange}
                onSelectParty={handleSelectParty}
                onSelectAll={handleSelectAll}
                onBulkDelete={handleBulkDeleteClick}
                onPartyDeleted={handlePartyDeleted}
                onPageChange={handlePageChange}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Party Dialog */}
      <CreatePartyDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handlePartyCreated}
      />
    </div>
  );
}

