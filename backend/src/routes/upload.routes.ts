import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { query } from '../config/database';
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
    const serviceResult = await query(
      'SELECT party_id FROM services WHERE id = $1',
      [serviceId]
    );
    
    if (serviceResult.rows.length === 0) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const service = serviceResult.rows[0];
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userPartyResult = await query(
        'SELECT id FROM parties WHERE user_id = $1',
        [req.user!.id]
      );
      
      if (
        userPartyResult.rows.length === 0 ||
        userPartyResult.rows[0].id !== service.party_id
      ) {
        // Delete uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Save document record
    const documentResult = await query(
      `INSERT INTO documents (
        service_id, document_type, file_name, file_path, file_size, mime_type
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        serviceId,
        document_type || 'general',
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
      ]
    );
    
    res.status(201).json({
      document: documentResult.rows[0],
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
    
    const documentResult = await query(
      `SELECT d.*, s.party_id 
       FROM documents d 
       JOIN services s ON d.service_id = s.id 
       WHERE d.id = $1`,
      [documentId]
    );
    
    if (documentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = documentResult.rows[0];
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userPartyResult = await query(
        'SELECT id FROM parties WHERE user_id = $1',
        [req.user!.id]
      );
      
      if (
        userPartyResult.rows.length === 0 ||
        userPartyResult.rows[0].id !== document.party_id
      ) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Send file
    res.download(document.file_path, document.file_name);
  })
);

// Delete document
router.delete(
  '/:documentId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId } = req.params;
    
    const documentResult = await query(
      `SELECT d.*, s.party_id 
       FROM documents d 
       JOIN services s ON d.service_id = s.id 
       WHERE d.id = $1`,
      [documentId]
    );
    
    if (documentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = documentResult.rows[0];
    
    // Check authorization
    if (req.user!.role === 'party') {
      const userPartyResult = await query(
        'SELECT id FROM parties WHERE user_id = $1',
        [req.user!.id]
      );
      
      if (
        userPartyResult.rows.length === 0 ||
        userPartyResult.rows[0].id !== document.party_id
      ) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Delete file from filesystem
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }
    
    // Delete database record
    await query('DELETE FROM documents WHERE id = $1', [documentId]);
    
    res.json({ message: 'Document deleted successfully' });
  })
);

export default router;

