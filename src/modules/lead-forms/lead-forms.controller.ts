import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Res, Req, UseGuards
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { LeadFormsService } from './lead-forms.service';
import { CreateLeadFormDto } from './dto/create-lead-form.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Lead Forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lead-forms')
export class LeadFormsController {
  constructor(private readonly leadFormsService: LeadFormsService) {}

  @Post()
  @ApiOperation({ summary: 'Admin: Create a new embeddable lead capture form' })
  create(@Body() dto: CreateLeadFormDto) {
    return this.leadFormsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lead forms' })
  findAll() {
    return this.leadFormsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single lead form by ID' })
  findOne(@Param('id') id: string) {
    return this.leadFormsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: Update a lead form configuration' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateLeadFormDto>) {
    return this.leadFormsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: Delete a lead form' })
  remove(@Param('id') id: string) {
    return this.leadFormsService.remove(id);
  }

  /**
   * Returns the raw HTML of the embeddable form.
   * PUBLIC endpoint — no auth required so it can be iframed on any website.
   */
  @Public()
  @Get(':id/embed')
  @ApiOperation({ summary: 'Public: Returns the embeddable HTML form page' })
  async getEmbedForm(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const form = await this.leadFormsService.findOne(id) as any;
    const protocol = req.protocol;
    const host = req.get('host');
    const apiBaseUrl = `${protocol}://${host}`;
    const html = this.leadFormsService.generateFormHtml(form, apiBaseUrl);
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
    const code = this.leadFormsService.getIframeCode(id, apiBaseUrl);
    return { iframeCode: code };
  }
}
