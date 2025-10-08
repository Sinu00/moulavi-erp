'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { partyAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { Plus, Menu } from 'lucide-react';
import CreatePartyDialog from '@/components/CreatePartyDialog';
import PartyList from '@/components/PartyList';

export default function PartyMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/auth');
      return;
    }
  }, [user, router]);

  const handlePartyCreated = () => {
    setRefreshKey(prev => prev + 1);
    setShowCreateDialog(false);
    toast.success('Party created successfully!');
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

        <div className="p-4 lg:p-8">
          {/* Party List */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">All Parties</CardTitle>
            </CardHeader>
            <CardContent>
              <PartyList key={refreshKey} />
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

