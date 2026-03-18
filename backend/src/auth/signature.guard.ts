import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ethers } from 'ethers';

/**
 * SignatureGuard — EIP-191 Signature Verification
 * 
 * Requires 3 headers:
 *   x-address:   Wallet address of the signer
 *   x-signature: Signed message
 *   x-timestamp: Unix timestamp (ms) — must be within 5 minutes
 * 
 * The signed message format: "vehicle-nft-auth:{address}:{timestamp}"
 * After verification, sets request.signer = verified address
 */
@Injectable()
export class SignatureGuard implements CanActivate {
  private static readonly MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    const address = request.headers['x-address'] as string;
    const signature = request.headers['x-signature'] as string;
    const timestamp = request.headers['x-timestamp'] as string;

    if (!address || !signature || !timestamp) {
      throw new UnauthorizedException(
        'Missing authentication headers: x-address, x-signature, x-timestamp',
      );
    }

    // Anti-replay: check timestamp is within MAX_AGE_MS
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > SignatureGuard.MAX_AGE_MS) {
      throw new UnauthorizedException('Signature expired or invalid timestamp');
    }

    // Verify signature
    const message = `vehicle-nft-auth:${address.toLowerCase()}:${timestamp}`;
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new UnauthorizedException('Signature does not match address');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid signature');
    }

    // Attach verified signer to request
    request.signer = ethers.getAddress(address); // checksum format
    return true;
  }
}
