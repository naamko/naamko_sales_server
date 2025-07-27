import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            rawBody?: Buffer;
            appId?: string;
        }
    }
}

// Middleware to capture raw body for signature verification
export const captureRawBody = (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET' || req.path === '/api/health') {
        return next();
    }
    let data = Buffer.alloc(0);
    req.on('data', (chunk: Buffer) => {
        data = Buffer.concat([data, chunk]);
    });
    req.on('end', () => {
        req.rawBody = data;
        next();
    });
};

// Request signing auth middleware using HMAC
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const signature = req.headers["x-signature"] as string;
    const timestamp = req.headers["x-timestamp"] as string;
    const appId = req.headers["x-app-id"] as string;

    if (!signature || !timestamp || !appId) {
        res.status(401).json({
            success: false,
            message: "Missing required headers: x-signature, x-timestamp, x-app-id"
        });
        return;
    }

    // Check if request is not too old (prevent replay attacks)
    const requestTime = parseInt(timestamp);
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 300; // 5 minutes

    if (isNaN(requestTime)) {
        res.status(401).json({
            success: false,
            message: "Invalid timestamp format"
        });
        return;
    }

    if (Math.abs(currentTime - requestTime) > maxAge) {
        res.status(401).json({
            success: false,
            message: "Request timestamp too old or too far in future"
        });
        return;
    }

    // Get the secret key from environment
    const secretKey = process.env.HMAC_SECRET;
    if (!secretKey) {
        console.error("HMAC_SECRET environment variable is not set");
        res.status(500).json({
            success: false,
            message: "Server configuration error"
        });
        return;
    }

    // Verify app ID
    const expectedAppId = process.env.APP_ID || "naamko-location-app";
    if (appId !== expectedAppId) {
        res.status(401).json({
            success: false,
            message: "Invalid app ID"
        });
        return;
    }

    // Create the signature string: METHOD|PATH|BODY|TIMESTAMP|APP_ID
    const method = req.method;
    const path = req.path;
    const body = req.rawBody ? req.rawBody.toString() : '';
    const signatureString = `${method}|${path}|${body}|${timestamp}|${appId}`;

    // DEBUG LOGGING
    console.log('=== SIGNATURE DEBUG ===');
    console.log('Method:', method);
    console.log('Path:', path);
    console.log('Body length:', body.length);
    console.log('Body content:', JSON.stringify(body.substring(0, 200)));
    console.log('Timestamp:', timestamp);
    console.log('App ID:', appId);
    console.log('Signature string:', signatureString);
    console.log('Secret key length:', secretKey.length);

    // Calculate expected signature
    const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(signatureString)
        .digest('hex');

    console.log('Expected signature:', expectedSignature);
    console.log('Received signature:', signature);
    console.log('======================');

    // Compare signatures using timing-safe comparison
    try {
        const providedBuffer = Buffer.from(signature, 'hex');
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');
        if (providedBuffer.length !== expectedBuffer.length ||
            !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
            res.status(401).json({
                success: false,
                message: "Invalid signature"
            });
            return;
        }
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Invalid signature format"
        });
        return;
    }

    // Add appId to request for potential use in routes
    req.appId = appId;
    next();
}

export default authMiddleware;
