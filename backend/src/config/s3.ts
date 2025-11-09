import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// S3 Client Configuration (optional)
export const s3Client = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY 
  ? new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

// Check if S3 is configured
export const isS3Configured = () => {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME);
};

// S3 Bucket Configuration
export const S3_CONFIG = {
  BUCKET_NAME: process.env.S3_BUCKET_NAME || 'moulavi-erp-documents',
  REGION: process.env.AWS_REGION || 'us-east-1',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf',
    'image/webp'
  ],
  DOCUMENT_TYPES: [
    'pan_card',
    'passport_front',
    'passport_back',
    'visa_copy',
    'other'
  ]
};

// Generate S3 key for document
export function generateS3Key(
  bookingId: string, 
  passengerId: string | null, 
  documentType: string, 
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  if (passengerId) {
    return `bookings/${bookingId}/passengers/${passengerId}/${documentType}/${timestamp}_${sanitizedFileName}`;
  }
  
  return `bookings/${bookingId}/${documentType}/${timestamp}_${sanitizedFileName}`;
}

// Generate presigned URL for upload
export async function generateUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }
  
  const command = new PutObjectCommand({
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    Metadata: {
      uploadedAt: new Date().toISOString(),
    },
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Generate presigned URL for download
export async function generateDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }
  
  const command = new GetObjectCommand({
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Delete file from S3
export async function deleteS3File(key: string): Promise<void> {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }
  
  const command = new DeleteObjectCommand({
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

// Validate file type
export function isValidFileType(mimeType: string): boolean {
  return S3_CONFIG.ALLOWED_FILE_TYPES.includes(mimeType);
}

// Validate file size
export function isValidFileSize(size: number): boolean {
  return size <= S3_CONFIG.MAX_FILE_SIZE;
}

// Validate document type
export function isValidDocumentType(documentType: string): boolean {
  return S3_CONFIG.DOCUMENT_TYPES.includes(documentType);
}

// Extract S3 key from URL
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Remove empty first element and bucket name
    const keyParts = pathParts.slice(2);
    
    return keyParts.join('/');
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return null;
  }
}

// Get file extension from MIME type
export function getFileExtension(mimeType: string): string {
  const extensions: { [key: string]: string } = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'application/pdf': '.pdf',
    'image/webp': '.webp',
  };
  
  return extensions[mimeType] || '.bin';
}

// Generate unique filename
export function generateUniqueFileName(originalName: string, mimeType: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(mimeType);
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `${baseName}_${timestamp}_${randomString}${extension}`;
}
