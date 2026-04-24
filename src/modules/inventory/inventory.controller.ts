import { Controller, Post, Body, Get } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('products')
  create(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Get('products')
  findAll() {
    return this.inventoryService.findAll();
  }
}
