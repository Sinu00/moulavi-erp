'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'party';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'staff' | 'party';
  isActive?: boolean;
}

interface UserFormProps {
  formData: CreateUserRequest;
  editingUser: User | null;
  onFormDataChange: (data: CreateUserRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function UserForm({ 
  formData, 
  editingUser, 
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: UserFormProps) {
  const handleInputChange = (field: keyof CreateUserRequest, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            placeholder="e.g., John Doe"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="e.g., john@example.com"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            Password {editingUser ? '(leave blank to keep current)' : '*'}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
            value={formData.password || ''}
            onChange={(e) => handleInputChange('password', e.target.value)}
            required={!editingUser}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">User Role *</Label>
          <Select 
            value={formData.role} 
            onValueChange={(value: 'admin' | 'staff' | 'party') => handleInputChange('role', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select user role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin - Full system access</SelectItem>
              <SelectItem value="staff">Staff - Limited access</SelectItem>
              <SelectItem value="party">Party - Customer access</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => handleInputChange('isActive', checked)}
          />
          <Label htmlFor="isActive">Active User</Label>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button type="submit" className="flex-1">
            {editingUser ? 'Update User' : 'Create User'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
