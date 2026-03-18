import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SignatureGuard } from './signature.guard';
import { ethers } from 'ethers';

describe('SignatureGuard', () => {
  let guard: SignatureGuard;

  beforeEach(() => {
    guard = new SignatureGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow if txHash is provided (fallback)', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          body: { txHash: '0x123', actor: '0xabc' },
        }),
      }),
    } as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException if headers missing', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          body: {},
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if signature is invalid', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-address': '0x1234567890123456789012345678901234567890',
            'x-signature': '0xinvalid',
            'x-timestamp': Date.now().toString(),
          },
          body: {},
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should allow valid signature', async () => {
    const wallet = ethers.Wallet.createRandom();
    const timestamp = Date.now().toString();
    const message = `vehicle-nft-auth:${wallet.address.toLowerCase()}:${timestamp}`;
    const signature = await wallet.signMessage(message);

    const mockRequest = {
      headers: {
        'x-address': wallet.address,
        'x-signature': signature,
        'x-timestamp': timestamp,
      },
      body: {},
      signer: undefined,
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(mockRequest.signer).toBe(wallet.address);
  });
});
