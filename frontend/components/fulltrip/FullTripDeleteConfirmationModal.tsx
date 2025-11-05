'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, AlertTriangle } from 'lucide-react';
import { FullTripMaster } from '@/types';

interface FullTripDeleteConfirmationModalProps {
  isOpen: boolean;
  trip: FullTripMaster | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function FullTripDeleteConfirmationModal({
  isOpen,
  trip,
  onConfirm,
  onCancel
}: FullTripDeleteConfirmationModalProps) {
  if (!trip) return null;

  // Build route string
  const getRouteString = () => {
    const fromCity = trip.fromCity?.name || 'Unknown';
    const toCities = (trip.toCities || [])
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .map(tc => tc.city?.name || 'Unknown');
    
    return [fromCity, ...toCities].join(' → ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Delete Full Trip</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this full trip?
          </p>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium">
              {trip.vehicleType?.vehicleName || 'Unknown Vehicle'} ({trip.vehicleType?.paxCount || 0} PAX)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Route: {getRouteString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Price: INR {trip.price.toLocaleString()}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This will permanently remove the full trip and may affect related bookings.
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

