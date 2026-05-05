import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaBuyersController } from './media-buyers.controller';
import { MediaBuyersService } from './media-buyers.service';
import { SpendLog, SpendLogSchema } from './schemas/spend-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SpendLog.name, schema: SpendLogSchema }]),
  ],
  controllers: [MediaBuyersController],
  providers: [MediaBuyersService],
  exports: [MediaBuyersService],
})
export class MediaBuyersModule {}
