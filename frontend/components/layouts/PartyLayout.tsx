'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getUser, removeUser } from '@/lib/auth';
import { toast } from 'sonner';
import { 
  Building, 
  User, 
  LogOut, 
  FileText, 
  Plane, 
  Users 
} from 'lucide-react';

interface PartyLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showHeader?: boolean;
}

export const PartyLayout: React.FC<PartyLayoutProps> = ({
  children,
  title,
  subtitle,
  showHeader = true,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      // Logout should continue even if API call fails
    } finally {
      removeUser();
      toast.success('Logged out successfully');
      router.push('/');
    }
  };

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Overview',
      description: 'Dashboard home',
      icon: FileText,
      href: '/party/dashboard',
      isActive: pathname === '/party/dashboard',
    },
    {
      id: 'individual',
      label: 'Individual Umrah Visa',
      description: 'Apply for individual visa',
      icon: Plane,
      href: '/party/umrah-visa',
      isActive: pathname === '/party/umrah-visa',
    },
    {
      id: 'group',
      label: 'Group Umrah Visa',
      description: 'Apply for group visa',
      icon: Users,
      href: '/party/umrah-visa-group',
      isActive: pathname === '/party/umrah-visa-group',
    },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col fixed h-screen">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center shadow-md">
              <Building className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{user.name}</h1>
              <p className="text-xs text-gray-500">Party Dashboard</p>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Dashboard
            </div>
            
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className={`w-full px-3 py-2 text-left rounded-lg transition-colors ${
                    item.isActive
                      ? 'bg-red-50 border border-red-200'
                      : 'hover:bg-red-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      item.isActive
                        ? 'bg-red-600'
                        : 'bg-red-100'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        item.isActive
                          ? 'text-white'
                          : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${
                        item.isActive ? 'text-red-900' : 'text-gray-900'
                      }`}>
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout} 
            className="w-full border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Top Header */}
        {showHeader && (
          <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
              </div>
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto relative">
          {children}
        </div>
      </div>
    </div>
  );
};
