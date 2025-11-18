'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { getUser, hasRole } from '@/lib/auth';
import { partyAPI, authAPI } from '@/lib/api';
import { Loader2, Save, Lock, User } from 'lucide-react';

interface Party {
  id: string;
  partyName: string;
  email: string;
  contactNumber?: string;
  whatsappNumber?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  customerType: 'direct' | 'b2b';
  accountCurrency?: {
    id: string;
    currencyCode: string;
    currencyName: string;
  };
  emailNotification: boolean;
  smsNotification: boolean;
  marketingNotification: boolean;
}

export default function PartySettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [party, setParty] = useState<Party | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  const [formData, setFormData] = useState({
    partyName: '',
    contactNumber: '',
    whatsappNumber: '',
    address: '',
    gstNumber: '',
    panNumber: '',
    aadhaarNumber: '',
    emailNotification: true,
    smsNotification: true,
    marketingNotification: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    setUser(currentUser);
    
    if (!currentUser || !hasRole('party')) {
      router.push('/');
      return;
    }

    loadPartyData();
  }, [router]);

  // Update formData when party data loads
  useEffect(() => {
    if (party) {
      setFormData({
        partyName: party.partyName || '',
        contactNumber: party.contactNumber || '',
        whatsappNumber: party.whatsappNumber || '',
        address: party.address || '',
        gstNumber: party.gstNumber || '',
        panNumber: party.panNumber || '',
        aadhaarNumber: party.aadhaarNumber || '',
        emailNotification: party.emailNotification ?? true,
        smsNotification: party.smsNotification ?? true,
        marketingNotification: party.marketingNotification ?? false,
      });
    }
  }, [party]);

  const loadPartyData = async () => {
    try {
      setLoading(true);
      const response = await partyAPI.getMyParty();
      const partyData = response.data.party;
      
      console.log('Loaded party data:', partyData); // Debug log
      
      if (!partyData) {
        toast.error('Party data not found');
        return;
      }
      
      setParty(partyData);
      
      // FormData will be set via useEffect when party state updates
      console.log('Loaded party data:', partyData); // Debug log
    } catch (error: any) {
      console.error('Error loading party data:', error);
      toast.error('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!party) return;

    try {
      setSaving(true);
      
      // Use the new my-party endpoint for party users
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/parties/my-party`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          party_name: formData.partyName,
          contact_number: formData.contactNumber,
          whatsapp_number: formData.whatsappNumber,
          address: formData.address,
          gst_number: formData.gstNumber,
          pan_number: formData.panNumber,
          aadhaar_number: formData.aadhaarNumber,
          email_notification: formData.emailNotification,
          sms_notification: formData.smsNotification,
          marketing_notification: formData.marketingNotification,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
      loadPartyData(); // Reload to get updated data
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setChangingPassword(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!mounted || !user) {
    return null;
  }

  if (loading) {
    return (
      <PartyLayout title="Settings" subtitle="Manage your profile and account settings">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </PartyLayout>
    );
  }

  return (
    <PartyLayout title="Settings" subtitle="Manage your profile and account settings">
      <div className="p-6">
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'profile'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </div>
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'password'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </div>
              </button>
            </nav>
          </div>

          {activeTab === 'profile' && (
            <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your party profile information. Email cannot be changed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="partyName">Party Name *</Label>
                      <Input
                        id="partyName"
                        value={formData.partyName}
                        onChange={(e) => handleInputChange('partyName', e.target.value)}
                        placeholder="Enter party name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={party?.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        value={formData.contactNumber}
                        onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                        placeholder="Enter contact number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                      <Input
                        id="whatsappNumber"
                        value={formData.whatsappNumber}
                        onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                        placeholder="Enter WhatsApp number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter address"
                    />
                  </div>
                </div>

                {/* Document Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Document Information</h3>
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gstNumber">GST Number</Label>
                      <Input
                        id="gstNumber"
                        value={formData.gstNumber}
                        onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                        placeholder="Enter GST number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="panNumber">PAN Number</Label>
                      <Input
                        id="panNumber"
                        value={formData.panNumber}
                        onChange={(e) => handleInputChange('panNumber', e.target.value)}
                        placeholder="Enter PAN number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                      <Input
                        id="aadhaarNumber"
                        value={formData.aadhaarNumber}
                        onChange={(e) => handleInputChange('aadhaarNumber', e.target.value)}
                        placeholder="Enter Aadhaar number"
                      />
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                {party?.accountCurrency && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label>Account Currency</Label>
                      <Input
                        value={`${party.accountCurrency.currencyCode} - ${party.accountCurrency.currencyName}`}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">Currency cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Customer Type</Label>
                      <Input
                        value={party.customerType === 'direct' ? 'Direct' : 'B2B'}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">Customer type cannot be changed</p>
                    </div>
                  </div>
                )}

                {/* Notification Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="emailNotification">Email Notifications</Label>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <input
                        type="checkbox"
                        id="emailNotification"
                        checked={formData.emailNotification}
                        onChange={(e) => handleInputChange('emailNotification', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="smsNotification">SMS Notifications</Label>
                        <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                      </div>
                      <input
                        type="checkbox"
                        id="smsNotification"
                        checked={formData.smsNotification}
                        onChange={(e) => handleInputChange('smsNotification', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="marketingNotification">Marketing Notifications</Label>
                        <p className="text-sm text-gray-500">Receive marketing communications</p>
                      </div>
                      <input
                        type="checkbox"
                        id="marketingNotification"
                        checked={formData.marketingNotification}
                        onChange={(e) => handleInputChange('marketingNotification', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your account password. Make sure to use a strong password.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password *</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password *</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                      required
                    />
                    <p className="text-xs text-gray-500">Password must be at least 6 characters long</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>
      </div>
    </PartyLayout>
  );
}

