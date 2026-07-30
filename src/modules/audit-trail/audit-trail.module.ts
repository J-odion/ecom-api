import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditTrail, AuditTrailSchema } from './schemas/audit-trail.schema';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrailController } from './audit-trail.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditTrail.name, schema: AuditTrailSchema }]),
  ],
  controllers: [AuditTrailController],
  providers: [AuditTrailService],
  exports: [AuditTrailService],
})
export class AuditTrailModule {}
