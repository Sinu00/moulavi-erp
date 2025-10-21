import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Step1Data } from '@/lib/umrah/types';

interface GroupDetailsStepProps {
  data: Step1Data;
  onChange: (data: Partial<Step1Data>) => void;
  disabled?: boolean;
}

export const GroupDetailsStep: React.FC<GroupDetailsStepProps> = ({
  data,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-base font-medium">Group Information *</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="groupNumber">Group Number *</Label>
            <Input
              id="groupNumber"
              placeholder="Enter group number"
              value={data.groupNumber || ''}
              onChange={(e) => onChange({ groupNumber: e.target.value })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              placeholder="Enter group name"
              value={data.groupName || ''}
              onChange={(e) => onChange({ groupName: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
