import { Module } from '@nestjs/common';
import { SignatureGuard } from './signature.guard';

@Module({
  providers: [SignatureGuard],
  exports: [SignatureGuard],
})
export class AuthModule {}
