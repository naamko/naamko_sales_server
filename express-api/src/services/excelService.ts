import ExcelJS from 'exceljs';
import { db } from '../database/connection';

export class ExcelService {

    async generateLocationReportsExcel(): Promise<Buffer> {
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Location Reports');

        // Define columns
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 40 },
            { header: 'Employee Name', key: 'employee_name', width: 20 },
            { header: 'Location Name', key: 'location_name', width: 25 },
            { header: 'Location Type', key: 'location_type', width: 15 },
            { header: 'Latitude', key: 'latitude', width: 12 },
            { header: 'Longitude', key: 'longitude', width: 12 },
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Time', key: 'time', width: 10 },
            { header: 'Image URL', key: 'image_url', width: 30 },
            { header: 'Image Size (KB)', key: 'image_size_kb', width: 15 },
            { header: 'Image Format', key: 'image_format', width: 12 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Fetch all location reports from database
        const query = `
      SELECT 
        id,
        employee_name,
        location_name,
        location_type,
        latitude,
        longitude,
        timestamp,
        image_url,
        image_size_kb,
        image_format,
        created_at
      FROM location_reports 
      ORDER BY timestamp DESC, created_at DESC
    `;

        const result = await db.query(query);
        const reports = result.rows;

        // Add data rows
        reports.forEach((report: any) => {
            const reportDate = new Date(report.timestamp);

            worksheet.addRow({
                id: report.id,
                employee_name: report.employee_name,
                location_name: report.location_name,
                location_type: report.location_type,
                latitude: parseFloat(report.latitude),
                longitude: parseFloat(report.longitude),
                date: reportDate.toLocaleDateString(),
                time: reportDate.toLocaleTimeString(),
                image_url: report.image_url || 'No image',
                image_size_kb: report.image_size_kb ? parseFloat(report.image_size_kb).toFixed(2) : 'N/A',
                image_format: report.image_format || 'N/A',
                created_at: new Date(report.created_at).toLocaleString()
            });
        });

        // Add some styling
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // Alternate row colors
            if (rowNumber > 1 && rowNumber % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8F8F8' }
                };
            }
        });

        // Auto-fit columns
        worksheet.columns.forEach((column) => {
            if (column.key === 'id') {
                column.width = 40; // Keep ID column wide for UUID
            }
        });

        // Add summary at the top
        worksheet.insertRow(1, []);
        worksheet.insertRow(1, ['Location Reports Export']);
        worksheet.insertRow(2, [`Generated on: ${new Date().toLocaleString()}`]);
        worksheet.insertRow(3, [`Total Reports: ${reports.length}`]);
        worksheet.insertRow(4, []);

        // Style the summary
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A2').font = { size: 12 };
        worksheet.getCell('A3').font = { size: 12, bold: true };

        // Merge cells for title
        worksheet.mergeCells('A1:L1');

        // Generate Excel file buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    async generateLocationReportsExcelFiltered(filters: {
        startDate?: string;
        endDate?: string;
        employeeName?: string;
        locationType?: string;
    }): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Filtered Location Reports');

        // Define columns (same as above)
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 40 },
            { header: 'Employee Name', key: 'employee_name', width: 20 },
            { header: 'Location Name', key: 'location_name', width: 25 },
            { header: 'Location Type', key: 'location_type', width: 15 },
            { header: 'Latitude', key: 'latitude', width: 12 },
            { header: 'Longitude', key: 'longitude', width: 12 },
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Time', key: 'time', width: 10 },
            { header: 'Image URL', key: 'image_url', width: 30 },
            { header: 'Image Size (KB)', key: 'image_size_kb', width: 15 },
            { header: 'Image Format', key: 'image_format', width: 12 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ];

        // Build dynamic WHERE clause
        const whereConditions: string[] = [];
        const whereValues: any[] = [];
        let paramCount = 0;

        if (filters.startDate) {
            paramCount++;
            whereConditions.push(`timestamp >= $${paramCount}`);
            whereValues.push(filters.startDate);
        }

        if (filters.endDate) {
            paramCount++;
            whereConditions.push(`timestamp <= $${paramCount}`);
            whereValues.push(filters.endDate);
        }

        if (filters.employeeName) {
            paramCount++;
            whereConditions.push(`employee_name ILIKE $${paramCount}`);
            whereValues.push(`%${filters.employeeName}%`);
        }

        if (filters.locationType) {
            paramCount++;
            whereConditions.push(`location_type = $${paramCount}`);
            whereValues.push(filters.locationType);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
      SELECT 
        id,
        employee_name,
        location_name,
        location_type,
        latitude,
        longitude,
        timestamp,
        image_url,
        image_size_kb,
        image_format,
        created_at
      FROM location_reports 
      ${whereClause}
      ORDER BY timestamp DESC, created_at DESC
    `;

        const result = await db.query(query, whereValues);
        const reports = result.rows;

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        reports.forEach((report: any) => {
            const reportDate = new Date(report.timestamp);

            worksheet.addRow({
                id: report.id,
                employee_name: report.employee_name,
                location_name: report.location_name,
                location_type: report.location_type,
                latitude: parseFloat(report.latitude),
                longitude: parseFloat(report.longitude),
                date: reportDate.toLocaleDateString(),
                time: reportDate.toLocaleTimeString(),
                image_url: report.image_url || 'No image',
                image_size_kb: report.image_size_kb ? parseFloat(report.image_size_kb).toFixed(2) : 'N/A',
                image_format: report.image_format || 'N/A',
                created_at: new Date(report.created_at).toLocaleString()
            });
        });

        // Add styling and summary
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            if (rowNumber > 1 && rowNumber % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8F8F8' }
                };
            }
        });

        // Add summary
        worksheet.insertRow(1, []);
        worksheet.insertRow(1, ['Filtered Location Reports Export']);
        worksheet.insertRow(2, [`Generated on: ${new Date().toLocaleString()}`]);
        worksheet.insertRow(3, [`Total Reports: ${reports.length}`]);

        // Add filter info
        let filterInfo = 'Filters: ';
        if (filters.startDate) filterInfo += `Start Date: ${filters.startDate} `;
        if (filters.endDate) filterInfo += `End Date: ${filters.endDate} `;
        if (filters.employeeName) filterInfo += `Employee: ${filters.employeeName} `;
        if (filters.locationType) filterInfo += `Location Type: ${filters.locationType} `;

        worksheet.insertRow(4, [filterInfo]);
        worksheet.insertRow(5, []);

        // Style summary
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A2').font = { size: 12 };
        worksheet.getCell('A3').font = { size: 12, bold: true };
        worksheet.getCell('A4').font = { size: 10, italic: true };

        worksheet.mergeCells('A1:L1');

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
}
