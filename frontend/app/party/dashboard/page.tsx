'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { serviceAPI } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Plus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Service } from '@/types';

export default function PartyDashboardPage() {
  const router = useRouter();
  const user = getUser();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
  });

  useEffect(() => {
    if (!user || !hasRole('party')) {
      router.push('/party-auth');
      return;
    }

    loadServices();
  }, [user, router]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const response = await serviceAPI.getAll({ page: 1, limit: 50 });
      const servicesData = response.data.services;
      setServices(servicesData);

      // Calculate stats
      setStats({
        total: servicesData.length,
        pending: servicesData.filter((s: any) => s.status === 'pending').length,
        processing: servicesData.filter((s: any) => s.status === 'processing').length,
        completed: servicesData.filter((s: any) => s.status === 'completed').length,
      });
    } catch (error) {
      // Error handling is done by the API interceptor
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Party Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome, {user.name}! Manage your service requests here.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Available Services */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Available Services</CardTitle>
            <CardDescription>Click on a service to submit a new request</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div
                onClick={() => router.push('/party/umrah-visa')}
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-indigo-50 to-purple-50"
              >
                <h3 className="text-xl font-semibold mb-2">Umrah Visa</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Apply for Umrah visa with all required documentation
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Apply Now
                </Button>
              </div>

              <div className="border rounded-lg p-6 bg-gray-50 opacity-50 cursor-not-allowed">
                <h3 className="text-xl font-semibold mb-2 text-gray-500">More Services</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Coming soon...
                </p>
                <Button disabled variant="outline">
                  Coming Soon
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Your Service Requests</CardTitle>
            <CardDescription>Track the status of your submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No service requests yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Click on a service above to submit your first request
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(service.status)}
                          <h3 className="font-semibold">
                            {service.service_type.replace('_', ' ').toUpperCase()}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Submitted: {format(new Date(service.submitted_at), 'PPp')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Request ID: {service.id.substring(0, 8)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                        {service.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

