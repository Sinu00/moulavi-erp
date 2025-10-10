import prisma from '../lib/prisma';

// Export prisma client for use throughout the application
export { prisma };

// Legacy query function for backward compatibility during migration
// This will be removed once all routes are updated to use Prisma
export const query = async (text: string, params?: any[]) => {
  // This is a temporary compatibility layer
  // In production, you should replace all query() calls with Prisma client calls
  console.warn('Using legacy query function. Consider migrating to Prisma client.');
  
  // For now, we'll use raw queries with Prisma
  return await prisma.$queryRawUnsafe(text, ...(params || []));
};

