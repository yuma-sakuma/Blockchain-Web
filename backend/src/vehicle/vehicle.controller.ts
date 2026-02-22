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
  ) {}

  @Get()
  @ApiQuery({ name: 'owner', required: false })
  async findAll(@Query('owner') owner?: string): Promise<Vehicle[]> {
    return this.vehicleService.findAll(owner);
  }

  @Get(':tokenId')
  async findOne(@Param('tokenId') tokenId: string): Promise<Vehicle> {
    return this.vehicleService.findOne(tokenId);
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

