'use client';

import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, DollarSign } from 'lucide-react';

interface CurrencyMaster {
  id: string;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  createdAt: string;
  updatedAt: string;
}

interface CurrencyCardProps {
  currency: CurrencyMaster;
  onEdit: (currency: CurrencyMaster) => void;
  onDelete: (currency: CurrencyMaster) => void;
  onView?: (currency: CurrencyMaster) => void;
}

export default function CurrencyCard({ 
  currency, 
  onEdit, 
  onDelete, 
  onView 
}: CurrencyCardProps) {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
          <DollarSign className="h-6 w-6 text-green-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900">{currency.currencyName}</h3>
          </div>
          <p className="text-sm text-gray-500">Symbol: {currency.symbol}</p>
          <p className="text-xs text-gray-400">Code: {currency.currencyCode}</p>
          {currency.createdAt && (
            <p className="text-xs text-gray-400">
              Created: {formatDate(currency.createdAt)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(currency)}
            title="View currency details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(currency)}
          title="Edit currency"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(currency)}
          className="text-red-600 hover:text-red-700"
          title="Delete currency"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
