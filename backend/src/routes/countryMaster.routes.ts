import { Router, Response } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import type { AuthRequest } from '../types';

const router = Router();

// Validation middleware for creating country
const createCountryValidation = [
  body('countryCode').isString().notEmpty().trim().withMessage('Country code is required'),
  body('countryName').isString().notEmpty().trim().withMessage('Country name is required'),
  body('currencyCode').isString().notEmpty().trim().withMessage('Currency code is required'),
];

// Create new country
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createCountryValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { countryCode, countryName, currencyCode } = req.body;

    // Check if country code already exists
    const existingCountry = await prisma.countryMaster.findFirst({
      where: { 
        countryCode: countryCode.toUpperCase(),
        isActive: true 
      }
    });

    if (existingCountry) {
      return res.status(400).json({ 
        error: 'Country with this code already exists' 
      });
    }

    const country = await prisma.countryMaster.create({
      data: {
        countryCode: countryCode.toUpperCase(),
        countryName,
        currencyCode: currencyCode.toUpperCase(),
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      data: { countryMaster: country },
      message: 'Country created successfully'
    });
  })
);

// Get all countries
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Get all countries (both active and inactive for admin view)
    const countries = await prisma.countryMaster.findMany({
      orderBy: { countryCode: 'asc' }
    });

    res.json({
      success: true,
      data: { countryMasters: countries }
    });
  })
);

// Get active countries (public endpoint)
router.get(
  '/active',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const countries = await prisma.countryMaster.findMany({
      where: { isActive: true },
      orderBy: { countryCode: 'asc' }
    });

    res.json({
      success: true,
      data: { countryMasters: countries }
    });
  })
);

// Get country by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const country = await prisma.countryMaster.findUnique({
      where: { id }
    });

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    res.json({
      success: true,
      data: { countryMaster: country }
    });
  })
);

// Update country
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  createCountryValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { countryCode, countryName, currencyCode } = req.body;

    // Check if country exists
    const existingCountry = await prisma.countryMaster.findUnique({
      where: { id }
    });

    if (!existingCountry) {
      return res.status(404).json({ error: 'Country not found' });
    }

    // Check if country code already exists (excluding current country)
    const duplicateCountry = await prisma.countryMaster.findFirst({
      where: { 
        countryCode: countryCode.toUpperCase(),
        isActive: true,
        id: { not: id }
      }
    });

    if (duplicateCountry) {
      return res.status(400).json({ 
        error: 'Country with this code already exists' 
      });
    }

    const updatedCountry = await prisma.countryMaster.update({
      where: { id },
      data: {
        countryCode: countryCode.toUpperCase(),
        countryName,
        currencyCode: currencyCode.toUpperCase()
      }
    });

    res.json({
      success: true,
      data: { countryMaster: updatedCountry },
      message: 'Country updated successfully'
    });
  })
);

// Delete country (soft delete)
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const country = await prisma.countryMaster.findUnique({
      where: { id }
    });

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    // Soft delete by setting isActive to false
    await prisma.countryMaster.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Country deleted successfully'
    });
  })
);

// Toggle country status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const country = await prisma.countryMaster.findUnique({
      where: { id }
    });

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    const updatedCountry = await prisma.countryMaster.update({
      where: { id },
      data: { isActive: !country.isActive }
    });

    res.json({
      success: true,
      data: { countryMaster: updatedCountry },
      message: `Country ${updatedCountry.isActive ? 'activated' : 'deactivated'} successfully`
    });
  })
);

export default router;

