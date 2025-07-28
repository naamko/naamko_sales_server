import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function(req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
        console.log('=== MULTER DESTINATION ===');
        console.log('Upload directory:', uploadDir);
        console.log('Directory exists:', fs.existsSync(uploadDir));
        console.log('==========================');
        cb(null, uploadDir);
    },
    filename: function(req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
        // Create unique filename with original extension
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const filename = "location-report-" + uniqueSuffix + ext;
        console.log('=== MULTER FILENAME ===');
        console.log('Original filename:', file.originalname);
        console.log('Generated filename:', filename);
        console.log('File mimetype:', file.mimetype);
        console.log('=======================');
        cb(null, filename);
    },
});

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    console.log('=== MULTER FILE FILTER ===');
    console.log('File originalname:', file.originalname);
    console.log('File mimetype:', file.mimetype);
    console.log('File fieldname:', file.fieldname);
    console.log('==========================');

    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        console.log('File rejected: not an image file');
        return cb(new Error("Only image files are allowed!"));
    }
    console.log('File accepted');
    cb(null, true);
};

// Create multer middleware with validation
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB (increased for location reports)
    },
    fileFilter: fileFilter,
});

// Single file upload for location reports
export const uploadSingle = upload.single('image');

// Error handling middleware for multer errors
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
    console.log('=== UPLOAD ERROR DEBUG ===');
    console.log('Error occurred:', error);
    console.log('Error type:', error.constructor.name);
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Request has file:', !!req.file);
    console.log('Request files:', req.files);
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('==========================');

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                error: 'Unexpected field name. Use "image".'
            });
        }
    }
    if (error.message === 'Only image files are allowed!') {
        return res.status(400).json({
            success: false,
            error: 'Only image files (jpg, jpeg, png, gif, webp) are allowed.'
        });
    }
    // Other errors
    return res.status(500).json({
        success: false,
        error: 'File upload error occurred.'
    });
};

export default upload;
