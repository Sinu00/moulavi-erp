import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import partyRoutes from './routes/party.routes';
import partyContactRoutes from './routes/partyContact.routes';
import uploadRoutes from './routes/upload.routes';
import userMasterRoutes from './routes/userMaster.routes';
import umrahVisaRoutes from './routes/umrahVisa.routes';
import umrahVisaIndividualRoutes from './routes/umrahVisaIndividual.routes';
import umrahVisaGroupRoutes from './routes/umrahVisaGroup.routes';
import umrahVisaWorkflowRoutes from './routes/umrahVisaWorkflow.routes';
import umrahVisaInvoiceRoutes from './routes/umrahVisaInvoice.routes';
import voucherRoutes from './routes/voucher.routes';
import auditRoutes from './routes/audit.routes';
import currencyMasterRoutes from './routes/currencyMaster.routes';
import countryMasterRoutes from './routes/countryMaster.routes';
import cityMasterRoutes from './routes/cityMaster.routes';
import locationMasterRoutes from './routes/locationMaster.routes';
import userRoleMasterRoutes from './routes/userRoleMaster.routes';
import vehicleTypeMasterRoutes from './routes/vehicleTypeMaster.routes';
import transportRouteMasterRoutes from './routes/transportRouteMaster.routes';
import transportMasterRoutes from './routes/transportMaster.routes';
import pricingMasterRoutes from './routes/pricingMaster.routes';
import cancellationRoutes from './routes/cancellation.routes';
import notificationRoutes from './routes/notifications.routes';

// Load environment variables from .env file in the backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app: Application = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

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
app.use('/api', partyContactRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userMasterRoutes);
// Register workflow routes first (more specific routes like /:bookingId/voucher-data)
// Then individual and group routes, then shared routes (less specific like /:bookingId)
app.use('/api/umrah-visa', umrahVisaWorkflowRoutes);
app.use('/api/umrah-visa', umrahVisaIndividualRoutes);
app.use('/api/umrah-visa', umrahVisaGroupRoutes);
app.use('/api/umrah-visa', umrahVisaRoutes);
app.use('/api/umrah-visa', umrahVisaInvoiceRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/currency-masters', currencyMasterRoutes);
app.use('/api/country-masters', countryMasterRoutes);
app.use('/api/city-masters', cityMasterRoutes);
app.use('/api/location-masters', locationMasterRoutes);
app.use('/api/user-role-masters', userRoleMasterRoutes);
app.use('/api/vehicle-type-masters', vehicleTypeMasterRoutes);
app.use('/api/transport-route-masters', transportRouteMasterRoutes);
app.use('/api/transport-masters', transportMasterRoutes);
app.use('/api/pricing-masters', pricingMasterRoutes);
app.use('/api/cancellation', cancellationRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on ${HOST}:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  
  // Check S3 configuration
  const { isS3Configured, getEndpoint } = require('./config/s3');
  if (isS3Configured()) {
    // Import getEndpoint function (we'll need to export it)
    const endpoint = getEndpoint() || 'AWS S3 (default)';
    const region = process.env.AWS_REGION || 'us-east-1';
    console.log(`☁️  S3 Storage: Configured (${process.env.S3_BUCKET_NAME})`);
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Region: ${region}`);
  } else {
    console.log(`📁 File Storage: Local (uploads/ directory)`);
    console.log(`💡 To use S3/Spaces, set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME`);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});