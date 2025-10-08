'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { partyAPI, serviceAPI } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Plus, Search, Users, FileText } from 'lucide-react';
import CreatePartyDialog from '@/components/CreatePartyDialog';
import PartyList from '@/components/PartyList';

export default function DashboardPage() {
  const router = useRouter();
  const user = getUser();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [stats, setStats] = useState({
    totalParties: 0,
    totalServices: 0,
    pendingServices: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/auth');
      return;
    }

    loadStats();
  }, [user, router]);

  const loadStats = async () => {
    try {
      const [partiesRes, servicesRes, pendingRes] = await Promise.all([
        partyAPI.getAll({ limit: 1 }),
        serviceAPI.getAll({ limit: 1 }),
        serviceAPI.getAll({ status: 'pending', limit: 1 }),
      ]);

      setStats({
        totalParties: partiesRes.data.pagination.total,
        totalServices: servicesRes.data.pagination.total,
        pendingServices: pendingRes.data.pagination.total,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handlePartyCreated = () => {
    setRefreshKey(prev => prev + 1);
    loadStats();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user.name}! Here&apos;s an overview of your system.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Parties</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParties}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registered clients
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Services</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalServices}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All service requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Services</CardTitle>
              <FileText className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingServices}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting processing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Party Management Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Party Management</CardTitle>
                <CardDescription>Manage your clients and their information</CardDescription>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Party
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PartyList key={refreshKey} />
          </CardContent>
        </Card>
      </div>

      <CreatePartyDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handlePartyCreated}
      />
    </div>
  );
}

