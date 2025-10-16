#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting production build..."

# Install all dependencies (including dev dependencies for build)
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build TypeScript
echo "🔨 Building TypeScript..."
npx tsc

echo "✅ Build completed successfully!"
