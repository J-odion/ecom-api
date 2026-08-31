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

  async findAll() {
    return this.productModel.aggregate([
      {
        $lookup: {
          from: 'stocklevels', // Mongoose usually lowercase and pluralizes Collection names
          localField: '_id',
          foreignField: 'productId',
          as: 'stockData'
        }
      },
      {
        $addFields: {
          stock: { $sum: '$stockData.stock' },
          cost: '$baseCost',
          price: '$sellingPrice',
          id: '$_id' // Map id for frontend
        }
      },
      {
        $project: {
          stockData: 0 // Remove the raw stock data array from output
        }
      }
    ]);
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

  async restock(productId: string, quantityRestocked: number): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) throw new NotFoundException('Product not found');
    
    product.stock += quantityRestocked;
    return product.save();
  }
}
