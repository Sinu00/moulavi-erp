'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';

interface AirportMaster {
  id: string;
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  airport: AirportMaster | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({ 
  isOpen, 
  airport, 
  onConfirm, 
  onCancel 
}: DeleteConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Airport
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{airport?.airportName}</strong>?
            <br />
            <span className="text-sm text-gray-500 mt-1 block">
              This action cannot be undone. If this airport is being used in bookings, it will be deactivated instead of deleted.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Airport
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
