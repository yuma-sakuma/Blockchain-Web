import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Vehicle } from '../database/entities/vehicle.entity';
import { VehicleService } from './vehicle.service';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehicleController {
  constructor(
    private readonly vehicleService: VehicleService,
    private readonly blockchainService: BlockchainService
  ) { }

  @Get()
  @ApiQuery({ name: 'owner', required: false })
  async findAll(@Query('owner') owner?: string): Promise<any[]> {
    const vehicles = await this.vehicleService.findAll(owner);
    return vehicles.map(v => ({
      ...v,
      warranty: v.warrantyJson
    }));
  }

  @Get('check-vin')
  @ApiQuery({ name: 'vin', required: true })
  async checkVinExists(@Query('vin') vin: string): Promise<{ exists: boolean }> {
    return this.vehicleService.checkVinExists(vin);
  }

  @Get(':tokenId')
  async findOne(@Param('tokenId') tokenId: string): Promise<any> {
    const v = await this.vehicleService.findOne(tokenId);
    return {
      ...v,
      warranty: v.warrantyJson
    };
  }

  @Get(':tokenId/onchain')
  async findOneOnChain(@Param('tokenId') tokenId: string) {
    const data = await this.blockchainService.vehicleNFTContract.getVehicle(tokenId);
    return {
      vinHash: data.vinHash,
      manufacturerId: data.manufacturerId,
      manufacturedAt: Number(data.manufacturedAt),
      modelHash: data.modelHash,
      specHash: data.specHash
    };
  }
}

