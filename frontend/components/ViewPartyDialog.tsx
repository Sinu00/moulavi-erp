'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Party } from '@/types';
import { Edit, X } from 'lucide-react';

interface ViewPartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  party: Party | null;
  onEdit?: (party: Party) => void;
}

export default function ViewPartyDialog({
  open,
  onOpenChange,
  party,
  onEdit
}: ViewPartyDialogProps) {
  if (!party) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <span>Party Details</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-4 px-1 space-y-6 pr-2">
          {/* Basic Information */}
          <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Basic Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Party Name</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.partyName}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.email}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Contact Number</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.contactNumber || 'N/A'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">WhatsApp Number</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.whatsappNumber || 'N/A'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Address</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.address || 'N/A'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">GST Number</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.gstNumber || 'N/A'}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">PAN Number</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.panNumber || 'N/A'}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Aadhaar Number</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.aadhaarNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Contact Person Details */}
            {party.contacts && party.contacts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Contact Person Details
                </h3>
                
                <div className="space-y-3">
                  {party.contacts.map((contact, index) => (
                    <div key={contact.id || index} className="p-3 border rounded-lg bg-gray-50">
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs font-medium text-gray-500">Contact Person Name</Label>
                          <p className="text-sm text-gray-900 mt-1">{contact.contactName}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-500">Contact Number</Label>
                          <p className="text-sm text-gray-900 mt-1">{contact.contactNumber}</p>
                        </div>
                        {contact.department && (
                          <div>
                            <Label className="text-xs font-medium text-gray-500">Department</Label>
                            <p className="text-sm text-gray-900 mt-1">{contact.department}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Business Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Business Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Customer Type</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={party.customerType === 'b2b' ? 'info' : 'success'}
                      className="text-xs"
                    >
                      {party.customerType.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Account Currency</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-xs">
                      {party.accountCurrency?.currencyCode || 'N/A'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Party Type</Label>
                  <div className="mt-1 flex gap-2">
                    {party.isSupplier && (
                      <Badge variant="secondary" className="text-xs">
                        Supplier
                      </Badge>
                    )}
                    {party.isCustomer && (
                      <Badge variant="secondary" className="text-xs">
                        Customer
                      </Badge>
                    )}
                  </div>
                </div>

                {party.isSupplier && party.supplierServiceTypes && party.supplierServiceTypes.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Supplier Service Types</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {party.supplierServiceTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Login Access</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={party.loginRequired ? 'success' : 'outline'} 
                      className="text-xs"
                    >
                      {party.loginRequired ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Notification Preferences
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email Notifications</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={party.emailNotification ? 'success' : 'outline'} 
                      className="text-xs"
                    >
                      {party.emailNotification ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">SMS Notifications</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={party.smsNotification ? 'success' : 'outline'} 
                      className="text-xs"
                    >
                      {party.smsNotification ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Marketing Notifications</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={party.marketingNotification ? 'success' : 'outline'} 
                      className="text-xs"
                    >
                      {party.marketingNotification ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            {party.documents && party.documents.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Documents
                </h3>
                
                <div className="space-y-2">
                  {party.documents.map((doc) => (
                    <div key={doc.id} className="p-2 border rounded-lg bg-gray-50 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {doc.documentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Timestamps
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created At</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(party.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(party.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
        </div>

        <SheetFooter className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {onEdit && (
            <Button
              type="button"
              onClick={() => {
                onEdit(party);
                onOpenChange(false);
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Party
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
