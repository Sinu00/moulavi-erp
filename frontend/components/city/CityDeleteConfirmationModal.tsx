'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CityMaster } from '@/types';

interface CityDeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city: CityMaster | null;
  onConfirm: () => void;
  loading?: boolean;
}

export default function CityDeleteConfirmationModal({
  open,
  onOpenChange,
  city,
  onConfirm,
  loading = false,
}: CityDeleteConfirmationModalProps) {
  if (!city) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete City</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this city? This action cannot be undone.
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900">{city.name}</p>
              <p className="text-xs text-gray-500">
                {city.country?.countryName || 'Unknown Country'} ({city.country?.countryCode || 'N/A'})
              </p>
            </div>
            <p className="text-xs text-red-500 mt-2">
              This will permanently remove the city. If there are locations associated with this city, deletion will be prevented.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

