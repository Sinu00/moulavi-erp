'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  itemName?: string;
  onConfirm: () => void;
  loading?: boolean;
  type?: 'single' | 'bulk';
  count?: number;
}

export default function DeleteConfirmationDialog({
  open,
  onOpenChange,
  title,
  message,
  itemName,
  onConfirm,
  loading = false,
  type = 'single',
  count = 1
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {type === 'bulk' ? (
              <>
                Are you sure you want to delete <strong>{count} parties</strong>?
                <br />
                <span className="text-sm text-gray-500 mt-1 block">
                  This action cannot be undone. If these parties are being used in bookings, they will be deactivated instead of deleted.
                </span>
              </>
            ) : (
              <>
                Are you sure you want to delete <strong>{itemName}</strong>?
                <br />
                <span className="text-sm text-gray-500 mt-1 block">
                  This action cannot be undone. If this party is being used in bookings, it will be deactivated instead of deleted.
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                {type === 'bulk' ? `Delete ${count} Parties` : 'Delete Party'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
