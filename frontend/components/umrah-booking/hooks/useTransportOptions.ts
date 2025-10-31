import { useState, useCallback } from 'react';
import { transportMasterAPI } from '@/lib/api';
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
      const fromLocationId =
        fromId ?? transportSegments?.[index]?.fromLocationId;
      const toLocationId = toId ?? transportSegments?.[index]?.toLocationId;
      if (!fromLocationId || !toLocationId) return;
      try {
        const response = await transportMasterAPI.getByLocations(
          fromLocationId,
          toLocationId
        );
        const list = response.data.transportMasters || response.data || [];
        setRowOptions((prev) => ({ ...prev, [index]: list }));
      } catch (e) {
        // ignore
      }
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

