import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Vehicle } from '../database/entities/vehicle.entity';
import { VehicleService } from './vehicle.service';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiQuery({ name: 'owner', required: false })
  async findAll(@Query('owner') owner?: string): Promise<Vehicle[]> {
    return this.vehicleService.findAll(owner);
  }

  @Get(':tokenId')
  async findOne(@Param('tokenId') tokenId: string): Promise<Vehicle> {
    return this.vehicleService.findOne(tokenId);
  }
}

