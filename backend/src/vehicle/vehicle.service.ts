import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../database/entities/vehicle.entity';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
  ) {}

  async findAll(owner?: string): Promise<Vehicle[]> {
    const whereClause = owner ? { currentOwnerAddress: owner } : {};
    return this.vehicleRepository.find({
      where: whereClause,
      relations: ['events'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tokenId: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { tokenId },
      relations: ['events'],
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with tokenId ${tokenId} not found`);
    }

    return vehicle;
  }
}

