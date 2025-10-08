'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getUser, removeUser } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';
import { LogOut, User } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const user = getUser();

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      // Logout should continue even if API call fails
      // Error handling is done by the API interceptor
    } finally {
      removeUser();
      toast.success('Logged out successfully');
      router.push('/');
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-indigo-600">ERP</h1>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{user.name}</span>
                <span className="text-gray-500">({user.role})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

