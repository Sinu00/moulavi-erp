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
import { TransportRouteMaster } from '@/types';

interface TransportRouteDeleteConfirmationModalProps {
  route: TransportRouteMaster | null;
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TransportRouteDeleteConfirmationModal({
  route,
  open,
  loading,
  onConfirm,
  onCancel,
}: TransportRouteDeleteConfirmationModalProps) {
  const getRouteString = () => {
    if (!route) return '';
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    return cities.join(' → ');
  };

  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Transport Route</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the route <strong>{getRouteString()}</strong>? This action cannot be undone.
            {route && (
              <div className="mt-2 text-sm text-gray-600">
                <p>Route Type: {route.routeType}</p>
              </div>
            )}
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

