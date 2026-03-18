import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * API Key Guard — validates `x-api-key` header against process.env.API_KEY.
 *
 * Fix for Audit §7.2: The POST /events endpoint was fully open, allowing
 * any attacker to forge OWNERSHIP_TRANSFERRED events and steal vehicles.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const serverKey = process.env.API_KEY;

    // Graceful fallback: if API_KEY is not configured, allow all requests (dev mode)
    if (!serverKey) {
      return true;
    }

    if (!apiKey || apiKey !== serverKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
