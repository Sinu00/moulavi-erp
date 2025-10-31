import React from 'react';

interface HotelCoverageIndicatorProps {
  coveredDays: number;
  totalDays: number;
  coveragePercentage: number;
  remainingDays: number;
  showDetails?: boolean;
}

export const HotelCoverageIndicator: React.FC<HotelCoverageIndicatorProps> = ({
  coveredDays,
  totalDays,
  coveragePercentage,
  remainingDays,
  showDetails = true,
}) => {
  if (totalDays === 0) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-600">Coverage:</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              coveragePercentage === 100
                ? 'bg-green-500'
                : coveragePercentage >= 80
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${coveragePercentage}%` }}
          />
        </div>
        <span
          className={`font-medium ${
            coveragePercentage === 100
              ? 'text-green-600'
              : coveragePercentage >= 80
              ? 'text-yellow-600'
              : 'text-red-600'
          }`}
        >
          {coveredDays}/{totalDays} days ({coveragePercentage}%)
        </span>
        {showDetails && remainingDays > 0 && (
          <span className="text-red-600 font-medium">
            ⚠️ {remainingDays} day{remainingDays > 1 ? 's' : ''} uncovered
          </span>
        )}
      </div>
    </div>
  );
};

