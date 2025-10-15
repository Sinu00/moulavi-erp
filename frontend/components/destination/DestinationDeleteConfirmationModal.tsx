'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DestinationMaster {
  id: string;
  destinationCode: string;
  destinationName: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DestinationDeleteConfirmationModalProps {
  isOpen: boolean;
  destination: DestinationMaster | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DestinationDeleteConfirmationModal({
  isOpen,
  destination,
  onConfirm,
  onCancel
}: DestinationDeleteConfirmationModalProps) {
  if (!destination) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Delete Destination</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{destination.destinationName}</strong> ({destination.destinationCode})?
          </p>
          <p className="text-xs text-gray-500 mt-2">
            This will permanently remove the destination and may affect related bookings and transport routes.
          </p>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
