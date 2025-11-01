import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest } from '../types';

const router = Router();

const createUserRoleMasterValidation = [
  body('roleCode').isString().notEmpty().trim().isLength({ min: 2, max: 50 }),
  body('roleName').isString().notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('permissions').isArray().notEmpty(),
  body('permissions.*').isString().notEmpty(),
  body('description').optional().isString().trim(),
  body('isActive').optional().isBoolean(),
];

const updateUserRoleMasterValidation = [
  body('roleCode').optional().isString().notEmpty().trim().isLength({ min: 2, max: 50 }),
  body('roleName').optional().isString().notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('permissions').optional().isArray(),
  body('permissions.*').optional().isString().notEmpty(),
  body('description').optional().isString().trim(),
  body('isActive').optional().isBoolean(),
];

// Create User Role Master
router.post(
  '/',
  authenticate,
  authorize('admin'),
  createUserRoleMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { roleCode, roleName, permissions, description, isActive } = req.body;

    const existingRole = await prisma.userRoleMaster.findUnique({
      where: { roleCode },
    });

    if (existingRole) {
      return res.status(400).json({ error: 'User role with this code already exists' });
    }

    const userRoleMaster = await prisma.userRoleMaster.create({
      data: {
        roleCode,
        roleName,
        permissions: permissions || [],
        description: description || null,
        isActive: isActive ?? true,
      },
    });

    res.status(201).json({ userRoleMaster });
  })
);

// Get all User Role Masters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search, isActive } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { roleName: { contains: search, mode: 'insensitive' } },
        { roleCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }

    const [userRoleMasters, total] = await Promise.all([
      prisma.userRoleMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { roleName: 'asc' },
      }),
      prisma.userRoleMaster.count({ where }),
    ]);

    res.json({
      userRoleMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get active User Role Masters
router.get(
  '/active',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userRoleMasters = await prisma.userRoleMaster.findMany({
      where: { isActive: true },
      orderBy: { roleName: 'asc' },
    });

    res.json({ userRoleMasters });
  })
);

// Get User Role Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userRoleMaster = await prisma.userRoleMaster.findUnique({
      where: { id },
    });

    if (!userRoleMaster) {
      return res.status(404).json({ error: 'User Role Master not found' });
    }

    res.json({ userRoleMaster });
  })
);

// Update User Role Master
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  updateUserRoleMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { roleCode, roleName, permissions, description, isActive } = req.body;

    // Check if role exists
    const existingRole = await prisma.userRoleMaster.findUnique({
      where: { id },
    });

    if (!existingRole) {
      return res.status(404).json({ error: 'User Role Master not found' });
    }

    // Check if roleCode is being changed and if new code already exists
    if (roleCode && roleCode !== existingRole.roleCode) {
      const codeExists = await prisma.userRoleMaster.findUnique({
        where: { roleCode },
      });
      if (codeExists) {
        return res.status(400).json({ error: 'User role with this code already exists' });
      }
    }

    const userRoleMaster = await prisma.userRoleMaster.update({
      where: { id },
      data: {
        roleCode,
        roleName,
        permissions: permissions !== undefined ? permissions : undefined,
        description: description !== undefined ? (description || null) : undefined,
        isActive,
      },
    });

    res.json({ userRoleMaster });
  })
);

// Toggle User Role Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userRoleMaster = await prisma.userRoleMaster.findUnique({
      where: { id },
    });

    if (!userRoleMaster) {
      return res.status(404).json({ error: 'User Role Master not found' });
    }

    const updatedUserRoleMaster = await prisma.userRoleMaster.update({
      where: { id },
      data: { isActive: !userRoleMaster.isActive },
    });

    res.json({ userRoleMaster: updatedUserRoleMaster });
  })
);

// Delete User Role Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await prisma.userRoleMaster.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  })
);

export default router;

