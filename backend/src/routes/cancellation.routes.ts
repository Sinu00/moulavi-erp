import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { CancellationService } from '../services/cancellationService';

const router = Router();

// Validation for cancellation policy
const createCancellationPolicyValidation = [
  body('name').isString().notEmpty().trim(),
  body('daysBeforeTravel').isInt({ min: 0 }),
  body('cancellationFee').isFloat({ min: 0 }),
  body('refundPercentage').isFloat({ min: 0, max: 100 }),
];

// Validation for booking cancellation
const cancelBookingValidation = [
  body('cancellationReason').isString().notEmpty().trim(),
];

// Calculate cancellation details for a booking
router.post(
  '/calculate/:bookingId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.params;
    const { cancellationDate } = req.body;
    
    const calculation = await CancellationService.calculateCancellation(
      bookingId,
      cancellationDate ? new Date(cancellationDate) : new Date()
    );
    
    res.json(calculation);
  })
);

// Cancel a booking
router.post(
  '/booking/:bookingId',
  authenticate,
  cancelBookingValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { bookingId } = req.params;
    const { cancellationReason, refundAmount, cancellationFee } = req.body;
    
    // Validate cancellation request first
    const validation = await CancellationService.validateCancellationRequest(bookingId);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: validation.message || 'Booking cannot be cancelled'
      });
    }
    
    const result = await CancellationService.cancelBooking({
      bookingId,
      cancellationReason,
      cancelledBy: req.user!.id,
      cancellationDate: new Date(),
      refundAmount,
      cancellationFee
    });
    
    if (!result.success) {
      return res.status(400).json({
        error: result.message || 'Error cancelling booking'
      });
    }
    
    res.json({
      message: result.message || 'Booking cancelled successfully',
      details: validation.details
    });
  })
);

// Create cancellation policy (admin only)
router.post(
  '/policy',
  authenticate,
  authorize('admin'),
  createCancellationPolicyValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, daysBeforeTravel, cancellationFee, refundPercentage } = req.body;
    
    const result = await CancellationService.createCancellationPolicy({
      name,
      daysBeforeTravel,
      cancellationFee,
      refundPercentage
    });
    
    if (!result.success) {
      return res.status(400).json({
        error: result.message || 'Error creating cancellation policy'
      });
    }
    
    res.status(201).json({
      message: result.message || 'Cancellation policy created successfully'
    });
  })
);

// Get all cancellation policies
router.get(
  '/policies',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { includeInactive = 'false' } = req.query;
    
    const policies = await CancellationService.getAllCancellationPolicies(
      includeInactive === 'true'
    );
    
    res.json({ policies });
  })
);

// Update cancellation policy (admin only)
router.put(
  '/policy/:policyId',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { policyId } = req.params;
    const { name, daysBeforeTravel, cancellationFee, refundPercentage } = req.body;
    
    const result = await CancellationService.updateCancellationPolicy(policyId, {
      name,
      daysBeforeTravel,
      cancellationFee,
      refundPercentage
    });
    
    if (!result.success) {
      return res.status(400).json({
        error: result.message || 'Error updating cancellation policy'
      });
    }
    
    res.json({
      message: result.message || 'Cancellation policy updated successfully'
    });
  })
);

// Deactivate cancellation policy (admin only)
router.patch(
  '/policy/:policyId/deactivate',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { policyId } = req.params;
    
    const result = await CancellationService.deactivateCancellationPolicy(policyId);
    
    if (!result.success) {
      return res.status(400).json({
        error: result.message || 'Error deactivating cancellation policy'
      });
    }
    
    res.json({
      message: result.message || 'Cancellation policy deactivated successfully'
    });
  })
);

// Get cancellation statistics (admin only)
router.get(
  '/stats',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await CancellationService.getCancellationStatistics();
    
    res.json({ stats });
  })
);

// Get booking cancellation history
router.get(
  '/history/:bookingId',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.params;
    
    const history = await CancellationService.getBookingCancellationHistory(bookingId);
    
    res.json({ history });
  })
);

// Validate cancellation request
router.post(
  '/validate/:bookingId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.params;
    const { cancellationDate } = req.body;
    
    const validation = await CancellationService.validateCancellationRequest(
      bookingId,
      cancellationDate ? new Date(cancellationDate) : new Date()
    );
    
    res.json(validation);
  })
);

export default router;
