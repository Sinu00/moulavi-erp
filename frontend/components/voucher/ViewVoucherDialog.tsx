'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { voucherAPI } from '@/lib/api';
import { toast } from 'sonner';

interface ViewVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherId: string | null;
}

export function ViewVoucherDialog({
  open,
  onOpenChange,
  voucherId,
}: ViewVoucherDialogProps) {
  const [loading, setLoading] = useState(false);
  const [voucher, setVoucher] = useState<any>(null);

  useEffect(() => {
    if (open && voucherId) {
      loadVoucher();
    }
  }, [open, voucherId]);

  const loadVoucher = async () => {
    if (!voucherId) return;

    try {
      setLoading(true);
      const response = await voucherAPI.getVoucherById(voucherId);
      setVoucher(response.data.voucher);
    } catch (error) {
      console.error('Error loading voucher:', error);
      toast.error('Failed to load voucher details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Voucher Details</DialogTitle>
          <DialogDescription>
            View complete voucher information
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : voucher ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Voucher Number</p>
                <p className="text-sm">{voucher.voucherNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Reservation Date</p>
                <p className="text-sm">{new Date(voucher.reservationDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Guest Name</p>
                <p className="text-sm">{voucher.guestName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Guest Mobile</p>
                <p className="text-sm">{voucher.guestMobile || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Group Code</p>
                <p className="text-sm">{voucher.groupCode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Passenger Count</p>
                <p className="text-sm">{voucher.paxCount}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created By</p>
                <p className="text-sm">{voucher.generatedByUser?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created Date</p>
                <p className="text-sm">{new Date(voucher.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {voucher.movementDetails && Array.isArray(voucher.movementDetails) && voucher.movementDetails.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Movement Details</p>
                <div className="space-y-2">
                  {voucher.movementDetails.map((movement: any, idx: number) => (
                    <div key={idx} className="border rounded p-2 text-sm">
                      <p><strong>Route:</strong> {movement.route || 'N/A'}</p>
                      <p><strong>Date:</strong> {movement.date || 'N/A'}</p>
                      <p><strong>Time:</strong> {movement.time || 'N/A'}</p>
                      <p><strong>From:</strong> {movement.fromLocation || 'N/A'}</p>
                      <p><strong>To:</strong> {movement.toLocation || 'N/A'}</p>
                      {movement.driverDetails1 && <p><strong>Driver 1:</strong> {movement.driverDetails1}</p>}
                      {movement.driverDetails2 && <p><strong>Driver 2:</strong> {movement.driverDetails2}</p>}
                      {movement.vehicleNumber && <p><strong>Vehicle:</strong> {movement.vehicleNumber}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No voucher data available</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

