// Step 5: Documents Component - Simple ZIP file upload (similar to group booking)

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { UploadCloud, File, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Step5Data, Step6Data, Step1Data, Step3Data } from '@/lib/umrah/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Image from 'next/image';

interface DocumentsStepProps {
  data: Step5Data | Step6Data;
  step1Data: Step1Data;
  step3Data: Step3Data;
  onChange: (data: Partial<Step5Data> | Partial<Step6Data>) => void;
  onStep1DataChange?: (data: Partial<Step1Data>) => void;
  disabled?: boolean;
}

export const DocumentsStep: React.FC<DocumentsStepProps> = ({
  data,
  step1Data,
  step3Data,
  onChange,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get the uploaded ZIP file from step5Data or step6Data
  const zipFile = (data as Step5Data | Step6Data).panCardZipFile || null;

  // Determine hasGroupNumber and accommodationType
  const hasGroupNumber = step1Data.bookingMode === 'group_number';
  const accommodationType = step3Data.accommodationType;

  // Generate dynamic instructions based on conditions
  const getInstructions = () => {
    const baseWarning = "All documents should be inside a ZIP file. Be sure all documents are attached, else the booking will be canceled by authorized personals.";
    
    let requiredDocs: string[] = [];

    if (hasGroupNumber && accommodationType === 'hotel') {
      requiredDocs = ['PAN card of all passengers'];
    } else if (hasGroupNumber && accommodationType === 'iqama') {
      requiredDocs = ['PAN card of all passengers', 'Iqama holder Iqama copy'];
    } else if (!hasGroupNumber && accommodationType === 'hotel') {
      requiredDocs = [
        'Passport front and back of all passengers',
        'PAN card of all passengers',
        'Passport sized photo of each passenger'
      ];
    } else if (!hasGroupNumber && accommodationType === 'iqama') {
      requiredDocs = [
        'Passport front and back of all passengers',
        'PAN card of all passengers',
        'Passport sized photo of each passenger',
        'Iqama holder Iqama copy'
      ];
    } else {
      // Fallback if accommodationType is not set yet
      requiredDocs = [
        'All required documents as per your booking type'
      ];
    }

    return { baseWarning, requiredDocs };
  };

  const { baseWarning, requiredDocs } = getInstructions();

  const handleFileSelect = (file: File) => {
    // Validate file type - accept ZIP files
    const isValidZip = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip');
    
    if (!isValidZip) {
      toast.error('Please upload a ZIP file (.zip) containing all documents');
      return;
    }

    // No max size validation - removed as per user requirement

    // Store the file in step5Data
    onChange({ panCardZipFile: file });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveFile = () => {
    onChange({ panCardZipFile: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Documents Upload</h4>
            <p className="text-sm text-gray-600">
              Upload a ZIP file containing all required documents
            </p>
          </div>
          <Dialog open={showSample} onOpenChange={setShowSample}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Show Sample
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Sample Documents</DialogTitle>
              </DialogHeader>
              <div className="relative w-full">
                <Image
                  src="/documentdemo.jpeg"
                  alt="Sample documents"
                  width={1200}
                  height={800}
                  className="w-full h-auto rounded-lg"
                  unoptimized
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {/* Upload Area */}
          {!zipFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 bg-gray-50 hover:border-red-400 hover:bg-red-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                onChange={handleFileInputChange}
                disabled={disabled}
                className="hidden"
              />
              
              <div className="flex flex-col items-center justify-center space-y-4">
                <UploadCloud className={`w-16 h-16 ${isDragging ? 'text-red-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-lg font-medium text-gray-700 mb-1">
                    {isDragging ? 'Drop your ZIP file here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-sm text-gray-500">
                    ZIP file containing all documents
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <File className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{zipFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(zipFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={disabled}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h6 className="font-medium text-red-900 mb-2">Important Instructions:</h6>
            <p className="text-sm text-red-800 mb-3 font-medium">
              {baseWarning}
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-900">Required Documents:</p>
              <ul className="space-y-1 text-sm text-red-800 list-disc list-inside ml-4">
                {requiredDocs.map((doc, index) => (
                  <li key={index}>{doc}</li>
                ))}
              </ul>
            </div>
            <div className="mt-3 pt-3 border-t border-red-200">
              <p className="text-xs text-red-700">
                <strong>Note:</strong> Create a ZIP file containing all required documents. Name each file clearly (e.g., passenger-name-document.pdf). Supported formats inside ZIP: PNG, JPG, PDF.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
