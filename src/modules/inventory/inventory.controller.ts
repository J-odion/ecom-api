import { Controller, Post, Body, Get, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { StockInDto } from './dto/stock-in.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('products')
  @ApiOperation({ summary: 'Create a new product' })
  create(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products' })
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get('stock-levels')
  @ApiOperation({ summary: 'Get stock levels for a product across all locations' })
  getStockLevels(@Query('productId') productId: string) {
    return this.inventoryService.getStockLevels(productId);
  }

  @Post('in')
  @ApiOperation({ summary: 'Record stock in for a specific location' })
  stockIn(@Body() dto: StockInDto) {
    return this.inventoryService.stockIn(dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer stock between locations' })
  transfer(@Body() dto: TransferStockDto) {
    return this.inventoryService.transferStock(dto);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update stock levels for a product at a specific location' })
  update(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.inventoryService.updateStock(id, dto);
  }
}
