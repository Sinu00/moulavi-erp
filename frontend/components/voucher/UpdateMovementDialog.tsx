'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { voucherAPI } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface UpdateMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: {
    voucherId: string;
    voucherNumber: string;
    movementIndex: number;
    driverDetails1: string;
    driverDetails2: string;
    vehicleNumber: string;
  } | null;
  onSuccess: () => void;
}

export function UpdateMovementDialog({
  open,
  onOpenChange,
  movement,
  onSuccess,
}: UpdateMovementDialogProps) {
  const [driverDetails1, setDriverDetails1] = useState('');
  const [driverDetails2, setDriverDetails2] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);

  useEffect(() => {
    if (movement && open) {
      setDriverDetails1(movement.driverDetails1 || '');
      setDriverDetails2(movement.driverDetails2 || '');
      setVehicleNumber(movement.vehicleNumber || '');
    }
  }, [movement, open]);

  const handleSubmit = async (sendNotification: boolean = false) => {
    if (!movement) return;

    try {
      if (sendNotification) {
        setSendingNotification(true);
      } else {
        setSubmitting(true);
      }

      // Update movement details
      await voucherAPI.updateMovementDetails(movement.voucherId, movement.movementIndex, {
        driverDetails1,
        driverDetails2,
        vehicleNumber,
      });

      // Send notification if requested
      if (sendNotification) {
        try {
          await voucherAPI.notifyMovementUpdate(movement.voucherId, movement.movementIndex);
          toast.success('Movement updated and notification sent successfully');
        } catch (error) {
          console.error('Error sending notification:', error);
          toast.warning('Movement updated but notification failed to send');
        }
      } else {
        toast.success('Movement updated successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating movement:', error);
      toast.error(error?.response?.data?.error || 'Failed to update movement');
    } finally {
      setSubmitting(false);
      setSendingNotification(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Movement Details</DialogTitle>
          <DialogDescription>
            Update driver and vehicle details for voucher {movement?.voucherNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="driverDetails1">Driver Details 1</Label>
            <Input
              id="driverDetails1"
              value={driverDetails1}
              onChange={(e) => setDriverDetails1(e.target.value)}
              placeholder="Enter driver 1 details"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driverDetails2">Driver Details 2</Label>
            <Input
              id="driverDetails2"
              value={driverDetails2}
              onChange={(e) => setDriverDetails2(e.target.value)}
              placeholder="Enter driver 2 details"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleNumber">Vehicle Number</Label>
            <Input
              id="vehicleNumber"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="Enter vehicle number"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting || sendingNotification}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={submitting || sendingNotification}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Only
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={submitting || sendingNotification}
            className="bg-green-600 hover:bg-green-700"
          >
            {sendingNotification && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update & Notify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

