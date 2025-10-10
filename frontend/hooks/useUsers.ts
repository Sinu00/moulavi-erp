import { useState, useEffect, useCallback } from 'react';
import { userAPI } from '@/lib/api';
import { User } from '@/types';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await userAPI.getAll({ search });
      setUsers(response.data.users);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setError(error.response?.data?.error || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);
  
  // CRITICAL: Use useCallback to prevent infinite loops
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  
  const createUser = async (userData: any) => {
    try {
      const response = await userAPI.create(userData);
      await loadUsers(); // Refresh the list
      return response.data;
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw error;
    }
  };
  
  const updateUser = async (id: string, userData: any) => {
    try {
      const response = await userAPI.update(id, userData);
      await loadUsers(); // Refresh the list
      return response.data;
    } catch (error: any) {
      console.error('Error updating user:', error);
      throw error;
    }
  };
  
  const deleteUser = async (id: string) => {
    try {
      await userAPI.delete(id);
      await loadUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };
  
  return { 
    users, 
    loading, 
    error,
    search, 
    setSearch, 
    loadUsers,
    createUser,
    updateUser,
    deleteUser
  };
}
