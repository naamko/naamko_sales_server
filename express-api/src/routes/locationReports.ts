import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { customAlphabet } from "nanoid";
import { db } from "../database/connection";
import {
  uploadSingle,
  handleUploadError,
} from "../middleware/uploadMiddleware";
import authMiddleware from "../middleware/authMiddleware";
import { ExcelService } from "../services/excelService";

const router = express.Router();
const excelService = new ExcelService();

const generateLocationId = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  6
);

async function generateUniqueLocationId(): Promise<string> {
  let locationId: string;
  let exists = true;

  while (exists) {
    locationId = generateLocationId();
    const result = await db.query(
      "SELECT location_id FROM location_reports WHERE location_id = $1",
      [locationId]
    );
    exists = result.rows.length > 0;
  }

  return locationId!;
}

// Public: Export Excel
router.get("/export/excel", async (req: Request, res: Response) => {
  try {
    console.log("📊 Generating Excel export...");
    const excelBuffer = await excelService.generateLocationReportsExcel();
    const filename = `location-reports-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", excelBuffer.length);
    res.send(excelBuffer);
  } catch (error) {
    console.error("❌ Error generating Excel export:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to generate Excel export" });
  }
});

// Protected: POST /location-reports
router.use(authMiddleware);

router.post(
  "/",
  (req: Request, res: Response, next: NextFunction) => {
    console.log("=== BEFORE UPLOAD MIDDLEWARE ===");
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Content-Length:", req.headers["content-length"]);
    next();
  },
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

      if (
        !employeeName ||
        !locationName ||
        !locationType ||
        !latitude ||
        !longitude ||
        !timestamp
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: employeeName, locationName, locationType, latitude, longitude, timestamp",
        });
      }

      const locationId = await generateUniqueLocationId();
      console.log("🆔 Generated location_id:", locationId);

      let imageUrl: string | null = null;
      let imageSizeKb: number | null = null;
      let imageFormat: string | null = null;

      if (req.file) {
        const originalExt = path.extname(req.file.originalname).toLowerCase();
        const oldPath = req.file.path;
        const newFilename = `${locationId}${originalExt}`;
        const newPath = path.join(path.dirname(oldPath), newFilename);

        fs.renameSync(oldPath, newPath);
        console.log(`🖼️ File renamed to ${newFilename}`);

        imageUrl = `/uploads/${newFilename}`;
        imageSizeKb = +(req.file.size / 1024).toFixed(2);
        imageFormat = originalExt.replace(".", "");
      }

      const insertQuery = `
        INSERT INTO location_reports 
        (location_id, employee_name, location_name, location_type, latitude, longitude, timestamp, image_url, image_size_kb, image_format)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const insertValues = [
        locationId,
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

      const result = await db.query(insertQuery, insertValues);
      const locationReport = result.rows[0];

      res.status(201).json({
        success: true,
        data: {
          id: locationReport.id,
          locationId: locationReport.location_id,
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
        message: "✅ Location report created successfully",
      });
    } catch (error) {
      console.error("❌ Error creating location report:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create location report",
      });
    }
  }
);

export default router;
