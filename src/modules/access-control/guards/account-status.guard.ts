import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { UserStatus } from '../enums/user-status.enum';

@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Some routes might be public. We assume this guard runs after JwtAuthGuard
    // and if request.user is set, we validate the status.
    if (!request.user || !request.user._id) {
      return true; // Let JwtAuthGuard handle unauthenticated requests
    }

    const userId = request.user._id;
    const user = await this.userModel.findById(userId).select('status tokenValidAfter').exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status}`);
    }

    // Checking tokenValidAfter. request.user might not contain iat unless passport maps it.
    // Assuming passport-jwt maps payload properties to request.user or we can decode token
    const token = request.headers.authorization?.split(' ')[1];
    if (token && user.tokenValidAfter) {
      try {
        const payloadStr = Buffer.from(token.split('.')[1], 'base64').toString();
        const payload = JSON.parse(payloadStr);
        if (payload.iat && (payload.iat * 1000) < user.tokenValidAfter.getTime()) {
          throw new UnauthorizedException('Token has been invalidated');
        }
      } catch (e) {
        // Ignore parsing errors, or handle appropriately
      }
    }

    return true;
  }
}
