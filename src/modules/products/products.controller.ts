import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { RestockProductDto } from './dto/restock-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: Partial<CreateProductDto>) {
    return this.productsService.update(id, updateProductDto);
  }

  @Post(':id/offers')
  @ApiOperation({ summary: 'Add a new offer to a product' })
  addOffer(@Param('id') id: string, @Body() offerDto: CreateOfferDto) {
    return this.productsService.addOffer(id, offerDto);
  }

  @Patch(':id/offers/:offerId')
  @ApiOperation({ summary: 'Update a specific offer' })
  updateOffer(
    @Param('id') id: string,
    @Param('offerId') offerId: string,
    @Body() offerDto: Partial<CreateOfferDto>
  ) {
    return this.productsService.updateOffer(id, offerId, offerDto);
  }

  @Delete(':id/offers/:offerId')
  @ApiOperation({ summary: 'Remove an offer from a product' })
  removeOffer(@Param('id') id: string, @Param('offerId') offerId: string) {
    return this.productsService.removeOffer(id, offerId);
  }

  @Patch(':id/restock')
  @ApiOperation({ summary: 'Restock a product in the inventory' })
  restock(@Param('id') id: string, @Body() restockDto: RestockProductDto) {
    return this.productsService.restock(id, restockDto.quantityRestocked);
  }
}
