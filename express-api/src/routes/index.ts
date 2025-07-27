import express from 'express';
import healthRouter from './health';
import locationReportsRouter from './locationReports';

const router = express.Router();

// Public route
router.use('/health', healthRouter);

// Protected routes
router.use('/location-reports', locationReportsRouter);
router.use('/reports', locationReportsRouter); // for /reports/export/excel

export default router;

