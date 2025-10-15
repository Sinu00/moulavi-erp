'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, User as UserIcon } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'party';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onView?: (user: User) => void;
}

export default function UserCard({ user, onEdit, onDelete, onView }: UserCardProps) {
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { color: 'bg-red-100 text-red-800', label: 'Admin' },
      staff: { color: 'bg-blue-100 text-blue-800', label: 'Staff' },
      party: { color: 'bg-green-100 text-green-800', label: 'Party' },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.staff;
    
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge className={`${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} border-0`}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
          <UserIcon className="h-6 w-6 text-indigo-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900">{user.name}</h3>
            {getRoleBadge(user.role)}
            {getStatusBadge(user.isActive || false)}
          </div>
          <p className="text-sm text-gray-500">{user.email}</p>
          {user.createdAt && (
            <p className="text-xs text-gray-400">
              Created: {formatDate(user.createdAt)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(user)}
            title="View user details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(user)}
          title="Edit user"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(user)}
          className="text-red-600 hover:text-red-700"
          title="Delete user"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
