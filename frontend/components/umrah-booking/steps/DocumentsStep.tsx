// Step 5: Documents Component - Simple ZIP file upload (similar to group booking)

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { UploadCloud, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Step5Data, Step1Data, Step3Data } from '@/lib/umrah/types';

interface DocumentsStepProps {
  data: Step5Data;
  step1Data: Step1Data;
  step3Data: Step3Data;
  onChange: (data: Partial<Step5Data>) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get the uploaded ZIP file from step5Data
  const zipFile = data.panCardZipFile || null;

  const handleFileSelect = (file: File) => {
    // Validate file type - accept ZIP files
    const isValidZip = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip');
    
    if (!isValidZip) {
      alert('Please upload a ZIP file (.zip) containing all documents');
      return;
    }

    // Validate file size (e.g., max 50MB for ZIP)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('File size exceeds 50MB limit. Please compress your files.');
      return;
    }

    // Store the file in step5Data
    onChange({ panCardZipFile: file } as any);
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
    onChange({ panCardZipFile: null } as any);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Documents Upload</h4>
        <p className="text-sm text-gray-600">
          Upload a ZIP file containing all required documents
        </p>
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
                    ZIP file containing all documents (MAX. 50MB)
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
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h6 className="font-medium text-blue-900 mb-2">Instructions:</h6>
            <ul className="space-y-1 text-sm text-blue-800 list-disc list-inside">
              <li>Create a ZIP file containing all required documents</li>
              <li>Name each file clearly (e.g., passenger-name-document.pdf)</li>
              <li>Maximum file size: 50MB</li>
              <li>Supported formats inside ZIP: PNG, JPG, PDF</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2">
              The ZIP file will be stored and can be downloaded later from the admin dashboard.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
