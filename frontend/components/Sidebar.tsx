'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Database,
  MapPin,
  Building2,
  FileType,
  Tag,
  CreditCard,
  Award,
  Plane,
  Receipt,
  TrendingUp,
  XCircle,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { getUser, removeUser } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed = false, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const [mastersOpen, setMastersOpen] = useState(false);

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

  const masterItems = [
    { name: 'Country Master', icon: MapPin, path: '/dashboard/masters/country' },
    { name: 'Wakala Master', icon: Building2, path: '/dashboard/masters/wakala' },
    { name: 'Doc Types Master', icon: FileType, path: '/dashboard/masters/doc-types' },
    { name: 'Post Category Master', icon: Tag, path: '/dashboard/masters/post-category' },
    { name: 'Party Master', icon: Users, path: '/dashboard/masters/party' },
    { name: 'Visa Master', icon: Award, path: '/dashboard/masters/visa' },
    { name: 'Bank Master', icon: CreditCard, path: '/dashboard/masters/bank' },
    { name: 'Certificate Master', icon: Award, path: '/dashboard/masters/certificate' },
    { name: 'Aircraft Master', icon: Plane, path: '/dashboard/masters/aircraft' },
    { name: 'Expense Master', icon: Receipt, path: '/dashboard/masters/expense' },
    { name: 'Income Master', icon: TrendingUp, path: '/dashboard/masters/income' },
    { name: 'Block List', icon: XCircle, path: '/dashboard/masters/block-list' },
  ];

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      onClick: () => router.push('/dashboard'),
    },
    {
      name: 'Services',
      icon: FileText,
      path: '/dashboard/services',
      onClick: () => toast.info('Services page coming soon'),
    },
  ];

  return (
    <div className={cn(
      "flex h-screen flex-col border-r bg-white transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* User Info & Toggle */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex-shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <User className="h-5 w-5" />
            </div>
          </div>
        )}
        <button
          onClick={() => onCollapsedChange?.(!collapsed)}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronsLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {/* Main Menu Items */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <button
                key={item.name}
                onClick={item.onClick}
                className={cn(
                  'flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed ? 'justify-center' : 'space-x-3',
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 shadow-sm border-l-2 border-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </button>
            );
          })}

          {/* Masters Section */}
          <div className="pt-2">
            <button
              onClick={() => {
                if (collapsed) {
                  // When collapsed, don't expand sidebar, just show toast
                  toast.info('Expand sidebar to access Masters');
                } else {
                  setMastersOpen(!mastersOpen);
                }
              }}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200",
                collapsed ? 'justify-center' : 'justify-between',
                mastersOpen && !collapsed && 'bg-gray-50'
              )}
              title={collapsed ? "Masters" : undefined}
            >
              <div className={cn("flex items-center", collapsed ? '' : 'space-x-3')}>
                <Database className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>Masters</span>}
              </div>
              {!collapsed && (
                <div className={cn("transition-transform duration-200", mastersOpen && "rotate-90")}>
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </button>

            {/* Masters Submenu */}
            {mastersOpen && !collapsed && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-indigo-200 pl-2 animate-in slide-in-from-top-2 duration-200">
                {masterItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        if (item.path === '/dashboard/masters/party') {
                          router.push(item.path);
                        } else {
                          toast.info(`${item.name} coming soon`);
                        }
                      }}
                      className={cn(
                        'flex w-full items-center space-x-2 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200',
                        isActive
                          ? 'bg-indigo-50 text-indigo-600 border-l-2 border-indigo-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-l-2 hover:border-gray-300'
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t p-3 space-y-1">
        <button
          onClick={() => toast.info('Settings coming soon')}
          className={cn(
            "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900",
            collapsed ? 'justify-center' : 'space-x-3'
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-red-50 hover:text-red-600",
            collapsed ? 'justify-center' : 'space-x-3'
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

