import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { BlockchainService } from '../blockchain/blockchain.service';
import { EventLog } from '../database/entities/event-log.entity';
import { EventService } from './event.service';

@ApiTags('Events')
@Controller('events')
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly blockchainService: BlockchainService,
  ) { }

  @Get()
  async findAll(): Promise<EventLog[]> {
    return this.eventService.findAll();
  }

  @Get('check-plate')
  @ApiQuery({ name: 'plateNo', required: true })
  async checkPlateExists(@Query('plateNo') plateNo: string): Promise<{ exists: boolean }> {
    return this.eventService.checkPlateExists(plateNo);
  }

  @Post()
  async create(@Body() createEventDto: any): Promise<EventLog> {
    // Serialize all event creation to prevent blockchain nonce collisions
    return this.blockchainService.withTxLock(() => this.eventService.create(createEventDto));
  }
}
