import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { LocationMaster } from '@/lib/umrah/types';

export interface ZiyarathEntry {
  id: string; // Unique ID for this entry
  ziyarathId: string; // LocationMaster ID of the ziyarath
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
}

interface ZiyarathTableProps {
  ziyaraths: ZiyarathEntry[];
  locationMasters: LocationMaster[];
  onUpdate: (index: number, field: keyof ZiyarathEntry, value: string) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export const ZiyarathTable: React.FC<ZiyarathTableProps> = ({
  ziyaraths,
  locationMasters,
  onUpdate,
  onRemove,
  disabled = false,
}) => {
  // Get available ziyarath locations (filter by ZIYARAT type)
  const availableZiyaraths = locationMasters.filter(
    (lm) => lm.locationType === 'ZIYARAT' && lm.id && lm.id.trim() !== ''
  );

  if (ziyaraths.length === 0 && availableZiyaraths.length === 0) {
    return (
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        No ziyarath locations available. Ziyarath entries will appear when you have hotels in Makkah or Madinah.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">#</th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Ziyarath Name</th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Date</th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Time</th>
            <th className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {ziyaraths.map((entry, index) => {
            const ziyarathLocation = locationMasters.find((lm) => lm.id === entry.ziyarathId);
            
            return (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 p-3 font-medium text-gray-900">{index + 1}</td>
                <td className="border border-gray-200 p-3">
                  <Select
                    value={entry.ziyarathId || undefined}
                    onValueChange={(value) => onUpdate(index, 'ziyarathId', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full max-w-[250px] [&>span]:truncate">
                      <SelectValue placeholder="Select ziyarath" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableZiyaraths.map((ziyarath) => (
                        <SelectItem key={ziyarath.id} value={ziyarath.id}>
                          {ziyarath.name} {ziyarath.city ? `(${ziyarath.city})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border border-gray-200 p-3">
                  <Input
                    type="date"
                    value={entry.date || ''}
                    onChange={(e) => onUpdate(index, 'date', e.target.value)}
                    disabled={disabled}
                    className="w-full"
                  />
                </td>
                <td className="border border-gray-200 p-3">
                  <Input
                    type="time"
                    value={entry.time || ''}
                    onChange={(e) => onUpdate(index, 'time', e.target.value)}
                    disabled={disabled}
                    className="w-full"
                  />
                </td>
                <td className="border border-gray-200 p-3 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRemove(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

