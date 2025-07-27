import express, { Request, Response } from 'express';
import path from 'path';
import { db } from '../database/connection';
import { uploadSingle, handleUploadError } from '../middleware/uploadMiddleware';
import authMiddleware from '../middleware/authMiddleware';
import { ExcelService } from '../services/excelService';

const router = express.Router();
const excelService = new ExcelService();

// Apply signing middleware to all location-related routes
router.use(authMiddleware);

// POST /location-reports
router.post(
    '/',
    uploadSingle,
    handleUploadError,
    async (req: Request, res: Response) => {
        try {
            const {
                employeeName,
                locationName,
                locationType,
                latitude,
                longitude,
                timestamp,
            } = req.body;

            if (!employeeName || !locationName || !locationType || !latitude || !longitude || !timestamp) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: employeeName, locationName, locationType, latitude, longitude, timestamp',
                });
            }

            let imageUrl: string | null = null;
            let imageSizeKb: number | null = null;
            let imageFormat: string | null = null;

            if (req.file) {
                imageUrl = `/uploads/${req.file.filename}`;
                imageSizeKb = +(req.file.size / 1024).toFixed(2);
                imageFormat = path.extname(req.file.originalname).slice(1).toLowerCase();
            }

            const query = `
        INSERT INTO location_reports 
        (employee_name, location_name, location_type, latitude, longitude, timestamp, image_url, image_size_kb, image_format)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

            const values = [
                employeeName,
                locationName,
                locationType,
                parseFloat(latitude),
                parseFloat(longitude),
                new Date(timestamp),
                imageUrl,
                imageSizeKb,
                imageFormat,
            ];

            const result = await db.query(query, values);
            const locationReport = result.rows[0];

            res.status(201).json({
                success: true,
                data: {
                    id: locationReport.id,
                    employeeName: locationReport.employee_name,
                    locationName: locationReport.location_name,
                    locationType: locationReport.location_type,
                    latitude: parseFloat(locationReport.latitude),
                    longitude: parseFloat(locationReport.longitude),
                    timestamp: locationReport.timestamp,
                    imageUrl: locationReport.image_url,
                    imageSizeKb: locationReport.image_size_kb,
                    imageFormat: locationReport.image_format,
                    createdAt: locationReport.created_at,
                },
                message: 'Location report created successfully',
            });
        } catch (error) {
            console.error('Error creating location report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create location report',
            });
        }
    }
);

// GET /reports/export/excel
router.get('/export/excel', async (req: Request, res: Response) => {
    try {
        console.log('📊 Generating Excel export for all location reports...');
        const excelBuffer = await excelService.generateLocationReportsExcel();
        const filename = `location-reports-${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', excelBuffer.length);
        res.send(excelBuffer);
    } catch (error) {
        console.error('Error generating Excel export:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate Excel export',
        });
    }
});

export default router;

