import { Router, Response } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { s3Client, S3_CONFIG, generateS3Key, generateDownloadUrl, deleteS3File, isValidFileType, isValidFileSize, isValidDocumentType, generateUniqueFileName, isS3Configured } from '../config/s3';
import { AuditService } from '../services/auditService';

const router = Router();

// Configure multer storage (S3 or local)
const storage = isS3Configured() 
  ? multerS3({
      s3: s3Client!,
      bucket: S3_CONFIG.BUCKET_NAME,
      key: (req: any, file: Express.Multer.File, cb: any) => {
        const { serviceId } = req.params;
        const { passenger_id, document_type } = req.body;
        
        // Generate unique filename
        const uniqueFileName = generateUniqueFileName(file.originalname, file.mimetype);
        
        // Generate S3 key
        const key = generateS3Key(serviceId, passenger_id || null, document_type || 'general', uniqueFileName);
        cb(null, key);
      },
      metadata: (req: any, file: Express.Multer.File, cb: any) => {
        cb(null, {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          uploadedBy: req.user?.id || 'unknown'
        });
      },
      contentType: multerS3.AUTO_CONTENT_TYPE,
    })
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
      },
    });

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Validate file type
  if (!isValidFileType(file.mimetype)) {
    return cb(new Error(`Invalid file type. Allowed types: ${S3_CONFIG.ALLOWED_FILE_TYPES.join(', ')}`));
  }
  
  // Validate document type
  const { document_type } = req.body;
  if (document_type && !isValidDocumentType(document_type)) {
    return cb(new Error(`Invalid document type. Allowed types: ${S3_CONFIG.DOCUMENT_TYPES.join(', ')}`));
  }
  
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: S3_CONFIG.MAX_FILE_SIZE, // Use configurable limit
  },
});

// Upload document for a service
router.post(
  '/service/:serviceId',
  authenticate,
  upload.single('document'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { serviceId } = req.params;
    const { document_type, passenger_id } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Verify service exists and user has access
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { partyId: true }
    });
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== service.partyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // If passenger_id is provided, verify it belongs to the service
    if (passenger_id) {
      const passenger = await prisma.umrahPassenger.findFirst({
        where: {
          id: passenger_id,
          booking: {
            serviceId: serviceId
          }
        }
      });
      
      if (!passenger) {
        return res.status(404).json({ error: 'Passenger not found for this service' });
      }
    }
    
    // Save document record
    const document = await prisma.document.create({
      data: {
        serviceId,
        passengerId: passenger_id || null,
        documentType: document_type || 'general',
        fileName: req.file.originalname,
        filePath: isS3Configured() ? (req.file as any).location : req.file.path, // S3 URL or local path
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });

    // Log document upload
    await AuditService.logDocumentUpload(
      document.id,
      req.user!.id,
      {
        fileName: document.fileName,
        documentType: document.documentType,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        passengerId: document.passengerId,
      },
      req
    );
    
    res.status(201).json({
      document,
      message: 'Document uploaded successfully',
    });
  })
);

// Upload multiple documents for Umrah visa booking
router.post(
  '/booking/:bookingId/passenger/:passengerId',
  authenticate,
  upload.array('documents', 10), // Max 10 files
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId, passengerId } = req.params;
    const { document_types } = req.body; // Array of document types
    
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Verify booking exists and user has access
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          select: { partyId: true }
        },
        passengers: {
          where: { id: passengerId }
        }
      }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.passengers.length === 0) {
      return res.status(404).json({ error: 'Passenger not found' });
    }
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== booking.service.partyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Parse document types (should be JSON array)
    let documentTypes: string[] = [];
    try {
      documentTypes = JSON.parse(document_types || '[]');
    } catch {
      documentTypes = ['general'];
    }
    
    // Create document records
    const documents = await Promise.all(
      files.map((file, index) => 
        prisma.document.create({
          data: {
            serviceId: booking.serviceId,
            passengerId: passengerId,
            documentType: documentTypes[index] || 'general',
            fileName: file.originalname,
            filePath: isS3Configured() ? (file as any).location : file.path, // S3 URL or local path
            fileSize: file.size,
            mimeType: file.mimetype
          }
        })
      )
    );

    // Log document uploads
    for (const document of documents) {
      await AuditService.logDocumentUpload(
        document.id,
        req.user!.id,
        {
          fileName: document.fileName,
          documentType: document.documentType,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          passengerId: document.passengerId,
        },
        req
      );
    }
    
    res.status(201).json({
      documents,
      message: `${documents.length} documents uploaded successfully`,
    });
  })
);

// Get document
router.get(
  '/:documentId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId } = req.params;
    
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        service: {
          select: { partyId: true }
        }
      }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== document.service.partyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Handle file download based on storage type
    if (isS3Configured()) {
      // Generate presigned URL for S3 file
      try {
        const downloadUrl = await generateDownloadUrl(document.filePath);
        res.json({
          downloadUrl,
          fileName: document.fileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType
        });
      } catch (error) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
      }
    } else {
      // Serve local file
      if (fs.existsSync(document.filePath)) {
        res.download(document.filePath, document.fileName);
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    }
  })
);

// Delete document
router.delete(
  '/:documentId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId } = req.params;
    
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        service: {
          select: { partyId: true }
        }
      }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check authorization
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== document.service.partyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Log document deletion
    await AuditService.logDocumentDeletion(
      documentId,
      req.user!.id,
      {
        fileName: document.fileName,
        documentType: document.documentType,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        passengerId: document.passengerId,
      },
      req
    );

    // Delete file based on storage type
    if (isS3Configured()) {
      // Delete file from S3
      try {
        await deleteS3File(document.filePath);
      } catch (error) {
        console.error('Error deleting S3 file:', error);
        // Continue with database deletion even if S3 deletion fails
      }
    } else {
      // Delete local file
      if (fs.existsSync(document.filePath)) {
        try {
          fs.unlinkSync(document.filePath);
        } catch (error) {
          console.error('Error deleting local file:', error);
          // Continue with database deletion even if file deletion fails
        }
      }
    }
    
    // Delete database record
    await prisma.document.delete({
      where: { id: documentId }
    });
    
    res.json({ message: 'Document deleted successfully' });
  })
);

export default router;

