'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

interface VehicleTypeMaster {
  id: string;
  vehicleName: string;
  paxCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VehicleTypeDeleteConfirmationModalProps {
  isOpen: boolean;
  vehicleType: VehicleTypeMaster | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function VehicleTypeDeleteConfirmationModal({ 
  isOpen, 
  vehicleType, 
  onConfirm, 
  onCancel 
}: VehicleTypeDeleteConfirmationModalProps) {
  const getWarningMessage = (vehicleType: VehicleTypeMaster) => {
    return `This action cannot be undone. The vehicle type "${vehicleType.vehicleName}" (${vehicleType.paxCount} PAX) will be permanently removed from the system.`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Vehicle Type
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{vehicleType?.vehicleName}</strong> ({vehicleType?.paxCount} PAX)?
            <br />
            <span className="text-sm text-gray-500 mt-1 block">
              {vehicleType && getWarningMessage(vehicleType)}
            </span>
            <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Warning: This vehicle type may be in use by existing transport routes.
              </span>
            </div>
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
            Delete Vehicle Type
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

