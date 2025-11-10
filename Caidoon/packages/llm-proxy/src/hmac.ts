import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function generateHmacSignature(body: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
}

export function verifyHmacSignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = generateHmacSignature(body, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export function createHmacMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-hmac-signature'];

    if (!signature || typeof signature !== 'string') {
      return res.status(401).json({
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Missing or invalid X-HMAC-Signature header',
        },
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const body = JSON.stringify(req.body);
      const isValid = verifyHmacSignature(body, signature, secret);

      if (!isValid) {
        return res.status(401).json({
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid HMAC signature',
          },
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        error: {
          code: 'SIGNATURE_VERIFICATION_FAILED',
          message: 'Failed to verify HMAC signature',
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
}
