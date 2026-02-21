import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventLog } from '../database/entities/event-log.entity';
import { EventService } from './event.service';

@ApiTags('Events')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async findAll(): Promise<EventLog[]> {
    return this.eventService.findAll();
  }

  @Post()
  async create(@Body() createEventDto: any): Promise<EventLog> {
    return this.eventService.create(createEventDto);
  }
}

