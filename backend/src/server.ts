import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import partyRoutes from './routes/party.routes';
import serviceRoutes from './routes/service.routes';
import uploadRoutes from './routes/upload.routes';
import userMasterRoutes from './routes/userMaster.routes';
import umrahVisaRoutes from './routes/umrahVisa.routes';
import auditRoutes from './routes/audit.routes';
import transportPricingRoutes from './routes/transportPricing.routes';
import transportMasterRoutes from './routes/transportMaster.routes';
import countryMasterRoutes from './routes/countryMaster.routes';
import currencyMasterRoutes from './routes/currencyMaster.routes';
import destinationMasterRoutes from './routes/destinationMaster.routes';
import hotelMasterRoutes from './routes/hotelMaster.routes';
import serviceTypeMasterRoutes from './routes/serviceTypeMaster.routes';
import userRoleMasterRoutes from './routes/userRoleMaster.routes';
import airportRouteMasterRoutes from './routes/airportRouteMaster.routes';
import partyLimitsRoutes from './routes/partyLimits.routes';
import cancellationRoutes from './routes/cancellation.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userMasterRoutes);
app.use('/api/umrah-visa', umrahVisaRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/transport-pricing', transportPricingRoutes);
app.use('/api/transport-masters', transportMasterRoutes);
app.use('/api/country-masters', countryMasterRoutes);
app.use('/api/currency-masters', currencyMasterRoutes);
app.use('/api/destination-masters', destinationMasterRoutes);
app.use('/api/hotel-masters', hotelMasterRoutes);
app.use('/api/service-type-masters', serviceTypeMasterRoutes);
app.use('/api/user-role-masters', userRoleMasterRoutes);
app.use('/api/airport-route-masters', airportRouteMasterRoutes);
app.use('/api/party-limits', partyLimitsRoutes);
app.use('/api/cancellation', cancellationRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  
  // Check S3 configuration
  const { isS3Configured } = require('./config/s3');
  if (isS3Configured()) {
    console.log(`☁️  S3 Storage: Configured (${process.env.S3_BUCKET_NAME})`);
  } else {
    console.log(`📁 File Storage: Local (uploads/ directory)`);
    console.log(`💡 To use S3, set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME`);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});