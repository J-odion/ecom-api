import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Res, Req, UseGuards
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { OrderFormsService } from './order-forms.service';
import { CreateOrderFormDto } from './dto/create-order-form.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Lead Forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('order-forms')
export class OrderFormsController {
  constructor(private readonly OrderFormsService: OrderFormsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DEV)
  @ApiOperation({ summary: 'Admin: Create a new embeddable lead capture form' })
  create(@Body() dto: CreateOrderFormDto) {
    return this.OrderFormsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lead forms' })
  findAll() {
    return this.OrderFormsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single lead form by ID' })
  findOne(@Param('id') id: string) {
    return this.OrderFormsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DEV)
  @ApiOperation({ summary: 'Admin: Update a lead form configuration' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateOrderFormDto>) {
    return this.OrderFormsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.DEV)
  @ApiOperation({ summary: 'Admin: Delete a lead form' })
  remove(@Param('id') id: string) {
    return this.OrderFormsService.remove(id);
  }

  /**
   * Returns the raw HTML of the embeddable form.
   * PUBLIC endpoint — no auth required so it can be iframed on any website.
   */
  @Public()
  @Get(':id/embed')
  @ApiOperation({ summary: 'Public: Returns the embeddable HTML form page' })
  async getEmbedForm(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const form = await this.OrderFormsService.findOne(id) as any;
    const protocol = req.protocol;
    const host = req.get('host');
    const apiBaseUrl = `${protocol}://${host}`;
    const html = this.OrderFormsService.generateFormHtml(form, apiBaseUrl);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', 'frame-ancestors *');
    res.send(html);
  }

  /**
   * Returns the iframe embed code string for placing on external websites.
   */
  @Get(':id/iframe-code')
  @ApiOperation({ summary: 'Get the iframe embed code for a lead form' })
  async getIframeCode(@Param('id') id: string, @Req() req: any) {
    const protocol = req.protocol;
    const host = req.get('host');
    const apiBaseUrl = `${protocol}://${host}`;
    const code = this.OrderFormsService.getIframeCode(id, apiBaseUrl);
    return { iframeCode: code };
  }

  /**
   * Webhook to receive partial (abandoned) or full (pending) submissions
   */
  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Public: Receive form submission or partial abandonment' })
  async webhook(@Body() payload: any) {
    return this.OrderFormsService.processWebhook(payload);
  }
}
