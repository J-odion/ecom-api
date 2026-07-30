import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditTrailService } from '../../modules/audit-trail/audit-trail.service';

@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, ip, user } = request;

    // Log write/update/delete operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // Create a sanitized body copy (excluding passwords/credentials)
      const sanitizedBody = { ...body };
      if (sanitizedBody.password) sanitizedBody.password = '********';
      if (sanitizedBody.newPass) sanitizedBody.newPass = '********';
      if (sanitizedBody.otp) sanitizedBody.otp = '********';

      return next.handle().pipe(
        tap({
          next: async (val) => {
            let userId = user?._id || null;
            let userEmail = user?.email || 'anonymous';

            // Special handling for logins and signup where req.user is not yet available
            if (url.includes('/auth/login') && body?.email) {
              userEmail = body.email;
              if (val?.userId) userId = val.userId;
            } else if (url.includes('/auth/signup') && body?.email) {
              userEmail = body.email;
            }

            const action = `${method} ${url}`;
            await this.auditTrailService.logAction({
              userId,
              userEmail,
              action,
              details: {
                body: sanitizedBody,
                status: 'SUCCESS',
              },
              ip,
            });
          },
          error: async (err) => {
            let userId = user?._id || null;
            let userEmail = user?.email || 'anonymous';

            if (url.includes('/auth/login') && body?.email) {
              userEmail = body.email;
            }

            const action = `${method} ${url} (FAILED)`;
            await this.auditTrailService.logAction({
              userId,
              userEmail,
              action,
              details: {
                body: sanitizedBody,
                status: 'FAILED',
                error: err.message || err.toString(),
              },
              ip,
            });
          },
        }),
      );
    }

    return next.handle();
  }
}
