import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG), PDF, and Word documents are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Upload document for a service
router.post(
  '/service/:serviceId',
  authenticate,
  upload.single('document'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { serviceId } = req.params;
    const { document_type } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Verify service exists and user has access
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { partyId: true }
    });
    
    if (!service) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== service.partyId) {
        // Delete uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Save document record
    const document = await prisma.document.create({
      data: {
        serviceId,
        documentType: document_type || 'general',
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });
    
    res.status(201).json({
      document,
      message: 'Document uploaded successfully',
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
    
    // Send file
    res.download(document.filePath, document.fileName);
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
    
    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }
    
    // Delete database record
    await prisma.document.delete({
      where: { id: documentId }
    });
    
    res.json({ message: 'Document deleted successfully' });
  })
);

export default router;

