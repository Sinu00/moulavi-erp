'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { userAPI } from '@/lib/api';

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

export function useUserMaster() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userAPI.getAll({ search: searchTerm });
      setUsers(response.data.users || []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load users';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (data: CreateUserRequest) => {
    try {
      await userAPI.create(data);
      // Don't show success toast here - parent component will handle it
      await loadUsers();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create user';
      toast.error(errorMessage);
      console.error('Error creating user:', error);
      return false;
    }
  };

  const updateUser = async (id: string, data: CreateUserRequest) => {
    try {
      await userAPI.update(id, data);
      // Don't show success toast here - parent component will handle it
      await loadUsers();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update user';
      toast.error(errorMessage);
      console.error('Error updating user:', error);
      return false;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await userAPI.delete(id);
      // Don't show success toast here - parent component will handle it
      await loadUsers();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete user';
      toast.error(errorMessage);
      console.error('Error deleting user:', error);
      return false;
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadUsers();
  }, [searchTerm]);

  return {
    users,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filteredUsers,
    createUser,
    updateUser,
    deleteUser,
    loadUsers
  };
}
