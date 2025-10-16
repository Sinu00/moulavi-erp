#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting production build..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Seed minimum data if needed
echo "🌱 Seeding minimum data..."
npm run seed-minimum

echo "✅ Build completed successfully!"
