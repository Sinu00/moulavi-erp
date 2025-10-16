// Soft delete utility functions for Prisma models

import { Prisma } from '@prisma/client';

/**
 * Soft delete filter to exclude deleted records
 */
export const softDeleteFilter = {
  isDeleted: false
};

/**
 * Soft delete data to mark record as deleted
 */
export const softDeleteData = {
  isDeleted: true,
  deletedAt: new Date()
};

/**
 * Restore soft deleted record
 */
export const restoreData = {
  isDeleted: false,
  deletedAt: null
};

/**
 * Prisma middleware to automatically filter out soft deleted records
 */
export const softDeleteMiddleware = async (params: any, next: any) => {
  // Only apply to find operations
  if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'findUnique') {
    // Add soft delete filter if not already present
    if (params.args?.where) {
      if (params.args.where.isDeleted === undefined) {
        params.args.where.isDeleted = false;
      }
    } else {
      params.args = params.args || {};
      params.args.where = { isDeleted: false };
    }
  }
  
  return next(params);
};

/**
 * Helper function to create soft delete where clause
 */
export function createSoftDeleteWhere<T extends Record<string, any>>(
  additionalWhere?: T
): T & { isDeleted: boolean } {
  return {
    ...additionalWhere,
    isDeleted: false
  } as T & { isDeleted: boolean };
}

/**
 * Helper function to create soft delete data
 */
export function createSoftDeleteData(): { isDeleted: boolean; deletedAt: Date } {
  return {
    isDeleted: true,
    deletedAt: new Date()
  };
}

/**
 * Helper function to create restore data
 */
export function createRestoreData(): { isDeleted: boolean; deletedAt: null } {
  return {
    isDeleted: false,
    deletedAt: null
  };
}

/**
 * Check if a record is soft deleted
 */
export function isSoftDeleted(record: { isDeleted?: boolean; deletedAt?: Date | null }): boolean {
  return record.isDeleted === true && record.deletedAt !== null;
}

/**
 * Get soft delete status message
 */
export function getSoftDeleteStatus(record: { isDeleted?: boolean; deletedAt?: Date | null }): string {
  if (isSoftDeleted(record)) {
    return `Deleted on ${record.deletedAt?.toISOString().split('T')[0]}`;
  }
  return 'Active';
}
