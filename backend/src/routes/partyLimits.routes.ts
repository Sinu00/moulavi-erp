import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { PartyLimitsService } from '../services/partyLimitsService';

const router = Router();

// Validation for party limits
const setPartyLimitsValidation = [
  body('partyId').isUUID(),
  body('maxPassengers').isInt({ min: 1, max: 100 }),
  body('maxPassengersIqama').isInt({ min: 1, max: 10 }),
  body('maxTravelDays').isInt({ min: 1, max: 365 }),
];

// Get party limits
router.get(
  '/:partyId',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId } = req.params;
    
    const result = await PartyLimitsService.getPartyLimits(partyId);
    
    if (!result.isValid) {
      return res.status(400).json({
        error: result.message || 'Error retrieving party limits'
      });
    }
    
    res.json(result);
  })
);

// Set party limits (admin only)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  setPartyLimitsValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { partyId, maxPassengers, maxPassengersIqama, maxTravelDays } = req.body;
    
    const result = await PartyLimitsService.setPartyLimits({
      partyId,
      maxPassengers,
      maxPassengersIqama,
      maxTravelDays
    });
    
    if (!result.isValid) {
      return res.status(400).json({
        error: result.message || 'Error setting party limits'
      });
    }
    
    res.status(201).json({
      limits: result.limits,
      message: 'Party limits set successfully'
    });
  })
);

// Update party limits (admin only)
router.put(
  '/:partyId',
  authenticate,
  authorize('admin'),
  setPartyLimitsValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { partyId } = req.params;
    const { maxPassengers, maxPassengersIqama, maxTravelDays } = req.body;
    
    const result = await PartyLimitsService.setPartyLimits({
      partyId,
      maxPassengers,
      maxPassengersIqama,
      maxTravelDays
    });
    
    if (!result.isValid) {
      return res.status(400).json({
        error: result.message || 'Error updating party limits'
      });
    }
    
    res.json({
      limits: result.limits,
      message: 'Party limits updated successfully'
    });
  })
);

// Validate passenger count
router.post(
  '/validate-passenger-count',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId, passengerCount, accommodationType } = req.body;
    
    if (!partyId || !passengerCount || !accommodationType) {
      return res.status(400).json({ 
        error: 'partyId, passengerCount, and accommodationType are required' 
      });
    }
    
    const validation = await PartyLimitsService.validatePassengerCount(
      partyId,
      passengerCount,
      accommodationType
    );
    
    res.json(validation);
  })
);

// Validate travel duration
router.post(
  '/validate-travel-duration',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId, arrivalDate, departureDate } = req.body;
    
    if (!partyId || !arrivalDate || !departureDate) {
      return res.status(400).json({ 
        error: 'partyId, arrivalDate, and departureDate are required' 
      });
    }
    
    const validation = await PartyLimitsService.validateTravelDuration(
      partyId,
      new Date(arrivalDate),
      new Date(departureDate)
    );
    
    res.json(validation);
  })
);

// Get all party limits with pagination (admin only)
router.get(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { 
      page = '1', 
      limit = '50',
      search 
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    const result = await PartyLimitsService.getAllPartyLimits(
      pageNum,
      limitNum,
      search as string
    );
    
    res.json(result);
  })
);

// Delete party limits (admin only)
router.delete(
  '/:partyId',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId } = req.params;
    
    const result = await PartyLimitsService.deletePartyLimits(partyId);
    
    if (!result.success) {
      return res.status(400).json({
        error: result.message || 'Error deleting party limits'
      });
    }
    
    res.json({
      message: result.message || 'Party limits deleted successfully'
    });
  })
);

// Get party limits statistics (admin only)
router.get(
  '/stats',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await PartyLimitsService.getPartyLimitsStatistics();
    
    res.json({ stats });
  })
);

// Bulk update party limits (admin only)
router.post(
  '/bulk-update',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { updates } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ 
        error: 'updates array is required' 
      });
    }
    
    const results = await PartyLimitsService.bulkUpdatePartyLimits(updates);
    
    res.json({
      results,
      message: `${results.length} party limits updated`
    });
  })
);

export default router;
