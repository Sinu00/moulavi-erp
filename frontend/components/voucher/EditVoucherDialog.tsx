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

interface EditVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherId: string | null;
  onSuccess: () => void;
}

export function EditVoucherDialog({
  open,
  onOpenChange,
  voucherId,
  onSuccess,
}: EditVoucherDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voucher, setVoucher] = useState<any>(null);
  const [formData, setFormData] = useState({
    guestName: '',
    guestMobile: '',
    groupCode: '',
    paxCount: 0,
  });

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
      const v = response.data.voucher;
      setVoucher(v);
      setFormData({
        guestName: v.guestName || '',
        guestMobile: v.guestMobile || '',
        groupCode: v.groupCode || '',
        paxCount: v.paxCount || 0,
      });
    } catch (error) {
      console.error('Error loading voucher:', error);
      toast.error('Failed to load voucher details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!voucherId) return;

    try {
      setSubmitting(true);
      // Note: We need to add an update endpoint to the API
      // For now, this is a placeholder
      toast.info('Edit functionality will be implemented with update endpoint');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating voucher:', error);
      toast.error(error?.response?.data?.error || 'Failed to update voucher');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Voucher</DialogTitle>
          <DialogDescription>
            Update voucher information
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guestName">Guest Name</Label>
              <Input
                id="guestName"
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestMobile">Guest Mobile</Label>
              <Input
                id="guestMobile"
                value={formData.guestMobile}
                onChange={(e) => setFormData({ ...formData, guestMobile: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupCode">Group Code</Label>
              <Input
                id="groupCode"
                value={formData.groupCode}
                onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paxCount">Passenger Count</Label>
              <Input
                id="paxCount"
                type="number"
                value={formData.paxCount}
                onChange={(e) => setFormData({ ...formData, paxCount: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting || loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

