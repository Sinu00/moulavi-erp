import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { TransportPricingService } from '../services/transportPricingService';

const router = Router();

// Validation for transport pricing
const createTransportPricingValidation = [
  body('routeId').isString().notEmpty().trim(),
  body('transportType').isString().notEmpty().trim(),
  body('paxCount').isInt({ min: 1 }),
  body('price').isFloat({ min: 0 }),
  body('validFrom').isISO8601().toDate(),
  body('validTo').optional().isISO8601().toDate(),
];

// Get transport pricing for specific configuration
router.get(
  '/price',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { routeId, transportType, paxCount, date } = req.query;
    
    if (!routeId || !transportType || !paxCount) {
      return res.status(400).json({ 
        error: 'routeId, transportType, and paxCount are required' 
      });
    }
    
    const pricingResult = await TransportPricingService.getTransportPrice({
      routeId: routeId as string, // Keep for backward compatibility
      transportType: transportType as string,
      paxCount: parseInt(paxCount as string),
      date: date ? new Date(date as string) : undefined
    });
    
    res.json(pricingResult);
  })
);

// Get all transport options for locations
router.get(
  '/options/:fromLocationId/:toLocationId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fromLocationId, toLocationId } = req.params;
    const { date } = req.query;
    
    const options = await TransportPricingService.getTransportOptions(
      fromLocationId,
      toLocationId,
      date ? new Date(date as string) : undefined
    );
    
    res.json({ options });
  })
);

// Legacy endpoint for backward compatibility
router.get(
  '/options/:routeId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    res.status(400).json({
      error: 'Endpoint deprecated',
      message: 'Please use /options/:fromLocationId/:toLocationId endpoint instead',
      details: 'The transport system now uses location-based routing'
    });
  })
);

// Create transport pricing (admin only)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  createTransportPricingValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { routeId, transportType, paxCount, price, validFrom, validTo } = req.body;
    
    const pricing = await TransportPricingService.createTransportPricing({
      routeId,
      transportType,
      paxCount,
      price,
      validFrom: new Date(validFrom),
      validTo: validTo ? new Date(validTo) : undefined
    });
    
    res.status(201).json({
      pricing,
      message: 'Transport pricing created successfully'
    });
  })
);

// Bulk create transport pricing (admin only)
router.post(
  '/bulk',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { pricingData } = req.body;
    
    if (!Array.isArray(pricingData) || pricingData.length === 0) {
      return res.status(400).json({ 
        error: 'pricingData array is required' 
      });
    }
    
    const results = await TransportPricingService.bulkCreateTransportPricing(pricingData);
    
    res.status(201).json({
      results,
      message: `${results.length} transport pricing entries created successfully`
    });
  })
);

// Get transport pricing history
router.get(
  '/history',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { 
      routeId, 
      transportType, 
      page = '1', 
      limit = '50' 
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    const result = await TransportPricingService.getTransportPricingHistory(
      routeId as string,
      transportType as string,
      pageNum,
      limitNum
    );
    
    res.json(result);
  })
);

// Deactivate transport pricing (admin only)
router.patch(
  '/:pricingId/deactivate',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { pricingId } = req.params;
    
    const pricing = await TransportPricingService.deactivateTransportPricing(pricingId);
    
    res.json({
      pricing,
      message: 'Transport pricing deactivated successfully'
    });
  })
);

// Get pricing statistics (admin only)
router.get(
  '/stats',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await TransportPricingService.getPricingStatistics();
    
    res.json({ stats });
  })
);

// Validate transport configuration
router.post(
  '/validate',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { routeId, transportType, paxCount, date } = req.body;
    
    if (!routeId || !transportType || !paxCount) {
      return res.status(400).json({ 
        error: 'routeId, transportType, and paxCount are required' 
      });
    }
    
    const validation = await TransportPricingService.validateTransportConfiguration(
      undefined, // fromLocationId
      undefined, // toLocationId
      transportType,
      paxCount,
      date ? new Date(date as string) : undefined,
      routeId // routeId for backward compatibility
    );
    
    res.json(validation);
  })
);

// Calculate total transport cost for multiple bookings
router.post(
  '/calculate-total',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookings } = req.body;
    
    if (!Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({ 
        error: 'bookings array is required' 
      });
    }
    
    const result = await TransportPricingService.calculateTotalTransportCost(bookings);
    
    res.json(result);
  })
);

export default router;
