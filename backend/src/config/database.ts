import prisma from '../lib/prisma';

// Export prisma client for use throughout the application
export { prisma };

// Legacy query function has been removed for safety (SQL injection risk).
// If you still have callers, migrate them to use the typed Prisma client.
export const query = async () => {
  throw new Error('Legacy query() removed. Migrate calls to use Prisma client.');
};

