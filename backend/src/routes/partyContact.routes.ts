import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

const router = Router();

// Validation middleware
const createContactValidation = [
  body('contact_name').isString().notEmpty().trim(),
  body('contact_number').isString().notEmpty().matches(/^[+]?[0-9]{10,15}$/, 'g').withMessage('Contact number must be 10-15 digits, optionally starting with +'),
  body('department').optional().isString().trim(),
];

const updateContactValidation = [
  body('contact_name').optional().isString().notEmpty().trim(),
  body('contact_number').optional().isString().notEmpty().matches(/^[+]?[0-9]{10,15}$/, 'g').withMessage('Contact number must be 10-15 digits, optionally starting with +'),
  body('department').optional().isString().trim(),
];

// Get all contacts for a party
router.get(
  '/party/:partyId/contacts',
  authenticate,
  authorize('admin', 'staff'),
  [param('partyId').isUUID().withMessage('Valid party ID is required')],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId } = req.params;
    
    // Verify party exists
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      select: { id: true }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    const contacts = await prisma.partyContact.findMany({
      where: { partyId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ contacts });
  })
);

// Create a contact for a party
router.post(
  '/party/:partyId/contacts',
  authenticate,
  authorize('admin', 'staff'),
  [param('partyId').isUUID().withMessage('Valid party ID is required')],
  createContactValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId } = req.params;
    const { contact_name, contact_number, department } = req.body;
    
    // Verify party exists
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      select: { id: true }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    const contact = await prisma.partyContact.create({
      data: {
        partyId,
        contactName: contact_name,
        contactNumber: contact_number,
        department: department || null
      }
    });
    
    res.status(201).json({ contact });
  })
);

// Update a contact
router.put(
  '/party/:partyId/contacts/:contactId',
  authenticate,
  authorize('admin', 'staff'),
  [
    param('partyId').isUUID().withMessage('Valid party ID is required'),
    param('contactId').isUUID().withMessage('Valid contact ID is required')
  ],
  updateContactValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId, contactId } = req.params;
    const { contact_name, contact_number, department } = req.body;
    
    // Verify contact exists and belongs to party
    const contact = await prisma.partyContact.findFirst({
      where: {
        id: contactId,
        partyId
      }
    });
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    const updateData: any = {};
    if (contact_name !== undefined) updateData.contactName = contact_name;
    if (contact_number !== undefined) updateData.contactNumber = contact_number;
    if (department !== undefined) updateData.department = department;
    
    const updatedContact = await prisma.partyContact.update({
      where: { id: contactId },
      data: updateData
    });
    
    res.json({ contact: updatedContact });
  })
);

// Delete a contact
router.delete(
  '/party/:partyId/contacts/:contactId',
  authenticate,
  authorize('admin', 'staff'),
  [
    param('partyId').isUUID().withMessage('Valid party ID is required'),
    param('contactId').isUUID().withMessage('Valid contact ID is required')
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId, contactId } = req.params;
    
    // Verify contact exists and belongs to party
    const contact = await prisma.partyContact.findFirst({
      where: {
        id: contactId,
        partyId
      }
    });
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    await prisma.partyContact.delete({
      where: { id: contactId }
    });
    
    res.json({ message: 'Contact deleted successfully' });
  })
);

export default router;
