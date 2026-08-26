import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateOfferDto } from './dto/create-offer.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdProduct = new this.productModel(createProductDto);
    return createdProduct.save();
  }

  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, updateProductDto: Partial<CreateProductDto>): Promise<Product> {
    const product = await this.productModel.findByIdAndUpdate(id, updateProductDto, { new: true }).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async addOffer(productId: string, offerDto: CreateOfferDto): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) throw new NotFoundException('Product not found');
    
    product.offers.push(offerDto);
    return product.save();
  }

  async updateOffer(productId: string, offerId: string, offerDto: Partial<CreateOfferDto>): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) throw new NotFoundException('Product not found');

    const offersArray = product.offers as any;
    const offer = offersArray.id(offerId);
    if (!offer) throw new NotFoundException('Offer not found');

    if (offerDto.name !== undefined) offer.name = offerDto.name;
    if (offerDto.price !== undefined) offer.price = offerDto.price;
    if (offerDto.quantity !== undefined) offer.quantity = offerDto.quantity;
    if (offerDto.isActive !== undefined) offer.isActive = offerDto.isActive;

    return product.save();
  }

  async removeOffer(productId: string, offerId: string): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) throw new NotFoundException('Product not found');

    const offersArray = product.offers as any;
    const offer = offersArray.id(offerId);
    if (!offer) throw new NotFoundException('Offer not found');

    offersArray.pull(offerId);
    return product.save();
  }
}
