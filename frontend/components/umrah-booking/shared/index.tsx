// Shared UI Components for Umrah Booking

import React from 'react';
import { Check, Users, Plane, Home, User, Truck, FileText } from 'lucide-react';
import { STEPS } from '@/lib/umrah/constants';

const iconMap = {
  Users,
  Plane,
  Home,
  Truck,
  User,
  FileText,
};

interface StepProgressProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (stepId: number) => void;
  steps?: Array<{
    id: number;
    title: string;
    description: string;
    icon: string;
  }>;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  completedSteps,
  onStepClick,
  steps = STEPS,
}) => {
  return (
    <div className="mb-6 lg:mb-8">
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        <div className={`grid gap-2 lg:gap-4 min-w-max lg:min-w-0 ${
          steps.length === 6 ? 'grid-cols-6' : 
          steps.length === 5 ? 'grid-cols-5' : 
          'grid-cols-4'
        }`}>
        {steps.map((step, index) => {
          const Icon = iconMap[step.icon as keyof typeof iconMap];
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isAccessible = step.id <= currentStep || completedSteps.includes(step.id);
          
          // Progress line should be red if:
          // 1. This step is completed (we've passed it), OR
          // 2. This step is the current step (showing progress toward next step)
          const shouldShowRedLine = isCompleted || isCurrent;
          
          return (
            <div key={step.id} className="flex flex-col items-center relative">
              {/* Progress Line */}
              {index < steps.length - 1 && (
                <div className={`absolute top-5 lg:top-6 left-1/2 w-1/2 h-0.5 z-0 ${
                  shouldShowRedLine ? 'bg-red-400' : 'bg-gray-200'
                }`} />
              )}
              
              <button
                onClick={() => onStepClick(step.id)}
                disabled={!isAccessible}
                className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center border-2 transition-all shadow-sm relative z-10 ${
                  isCompleted
                    ? 'bg-red-400 border-red-400 text-white'
                    : isCurrent
                    ? 'bg-red-500 border-red-500 text-white ring-2 ring-red-200 ring-offset-2'
                    : isAccessible
                    ? 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                    : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 lg:h-6 lg:w-6" />
                ) : (
                  <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
                )}
              </button>
              
              <div className="mt-2 lg:mt-4 text-center px-1 lg:px-2">
                <p className={`text-xs lg:text-sm font-medium mb-0.5 lg:mb-1 ${
                  isCurrent ? 'text-red-600 font-semibold' : isCompleted ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                <p className={`text-[10px] lg:text-xs leading-relaxed hidden lg:block ${
                  isCurrent ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};

interface ValidationMessageProps {
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  message,
  type = 'error',
}) => {
  const baseClasses = 'p-4 rounded-lg text-sm';
  const typeClasses = {
    error: 'bg-red-50 border border-red-200 text-red-800',
    warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border border-blue-200 text-blue-800',
    success: 'bg-green-50 border border-green-200 text-green-800',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      {message}
    </div>
  );
};

interface DocumentUploadProps {
  label: string;
  required?: boolean;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  label,
  required = false,
  accept = 'image/*,.pdf',
  file,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        {label} {required && '*'}
      </label>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
      />
      {file && (
        <p className="text-xs text-green-600">✓ {file.name}</p>
      )}
    </div>
  );
};

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};
