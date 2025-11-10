import { useState, useCallback } from 'react';
import { TransportBooking } from '@/lib/umrah/types';

interface UseTransportOptionsParams {
  transportSegments?: TransportBooking[];
}

export const useTransportOptions = ({
  transportSegments,
}: UseTransportOptionsParams) => {
  const [rowOptions, setRowOptions] = useState<{ [index: number]: any[] }>({});

  const loadOptionsForRow = useCallback(
    async (index: number, fromId?: string, toId?: string) => {
      // TransportMaster has been removed - return empty options
      // TODO: Implement alternative transport options retrieval if needed
      const fromLocationId =
        fromId ?? transportSegments?.[index]?.fromLocationId;
      const toLocationId = toId ?? transportSegments?.[index]?.toLocationId;
      if (!fromLocationId || !toLocationId) return;
      // Return empty array since TransportMaster is removed
      setRowOptions((prev) => ({ ...prev, [index]: [] }));
    },
    [transportSegments]
  );

  const getOptionsForRow = useCallback(
    (index: number) => {
      return rowOptions[index] || [];
    },
    [rowOptions]
  );

  const clearRowOptions = useCallback((index?: number) => {
    if (index !== undefined) {
      setRowOptions((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    } else {
      setRowOptions({});
    }
  }, []);

  return {
    loadOptionsForRow,
    getOptionsForRow,
    clearRowOptions,
  };
};

