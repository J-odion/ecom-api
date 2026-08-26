import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditTrailService } from '../../modules/audit-trail/audit-trail.service';

/**
 * Maps raw HTTP method + URL patterns to plain-English business action descriptions.
 * Makes the audit trail readable for non-technical business owners.
 */
function describeAction(method: string, url: string, body: any): { action: string; summary: string } {
  // Normalise URL — strip query params and replace MongoDB ObjectIds with :id
  const path = url.split('?')[0].replace(/\/[a-f0-9]{24}/gi, '/:id');
  const key = `${method} ${path}`;

  const rules: { pattern: RegExp; action: string; summary: (b: any) => string }[] = [
    // AUTH
    { pattern: /^POST \/auth\/login$/, action: 'Staff Login', summary: (b) => `${b?.email || 'A user'} signed into the system` },
    { pattern: /^POST \/auth\/logout$/, action: 'Staff Logout', summary: () => 'A user signed out of the system' },
    { pattern: /^POST \/auth\/signup$/, action: 'New Account Sign Up', summary: (b) => `New account created for ${b?.email || 'unknown'}` },
    { pattern: /^POST \/auth\/forgot-password$/, action: 'Password Reset Requested', summary: (b) => `Password reset was requested for ${b?.email || 'unknown'}` },
    { pattern: /^POST \/auth\/reset-password$/, action: 'Password Changed', summary: (b) => `Password was changed for ${b?.email || 'unknown'}` },
    { pattern: /^POST \/auth\/verify-otp$/, action: 'Account Email Verified', summary: (b) => `Email verification completed for ${b?.email || 'unknown'}` },
    { pattern: /^POST \/auth\/resend-otp$/, action: 'OTP Resent', summary: (b) => `A new verification code was sent to ${b?.email || 'unknown'}` },

    // USERS
    { pattern: /^POST \/users$/, action: 'New Staff Account Created', summary: (b) => `New staff member "${b?.fullName || b?.email || 'unknown'}" was added with role "${b?.role || 'unassigned'}"` },
    { pattern: /^GET \/users$/, action: 'Staff List Viewed', summary: () => 'The full team list was viewed' },
    { pattern: /^GET \/users\/:id$/, action: 'Staff Profile Viewed', summary: () => 'A staff member profile was viewed' },
    { pattern: /^PATCH \/users\/:id$/, action: 'Staff Profile Updated', summary: (b) => `A staff member's details were updated${b?.role ? ` (role set to "${b.role}")` : ''}` },
    { pattern: /^PATCH \/users\/:id\/role$/, action: 'Staff Role Changed', summary: (b) => `A staff member's role was changed to "${b?.role}"` },
    { pattern: /^PATCH \/users\/:id\/toggle-status$/, action: 'Staff Account Toggled', summary: () => 'A staff account was activated or deactivated' },
    { pattern: /^DELETE \/users\/:id$/, action: 'Staff Account Removed', summary: () => 'A staff account was removed from the system' },
    { pattern: /^GET \/users\/:id\/access$/, action: 'Staff Permissions Viewed', summary: () => "A staff member's access permissions were viewed" },
    { pattern: /^PATCH \/users\/:id\/access\/department$/, action: 'Staff Department Assigned', summary: () => "A staff member's department was updated" },
    { pattern: /^PATCH \/users\/:id\/access\/role$/, action: 'Staff Access Role Assigned', summary: () => "A staff member's access role was updated" },
    { pattern: /^PATCH \/users\/:id\/access\/toggle$/, action: 'Permission Override Applied', summary: (b) => `Permission "${b?.permissionKey}" was manually ${b?.granted ? 'granted to' : 'revoked from'} a staff member` },
    { pattern: /^DELETE \/users\/:id\/access\/override\/:id$/, action: 'Permission Override Removed', summary: () => 'A manual permission override was removed from a staff member' },

    // ORDERS
    { pattern: /^POST \/orders$/, action: 'New Order Created (Manual)', summary: (b) => `A new order was manually created for customer "${b?.customerName || 'unknown'}"` },
    { pattern: /^GET \/orders$/, action: 'Orders List Viewed', summary: () => 'The orders list was viewed' },
    { pattern: /^GET \/orders\/:id$/, action: 'Order Details Viewed', summary: () => 'An order record was opened and viewed' },
    { pattern: /^PATCH \/orders\/:id\/delivery-status$/, action: 'Order Delivery Status Updated', summary: (b) => `Delivery status was changed to "${b?.status}"` },
    { pattern: /^PATCH \/orders\/:id\/payment-status$/, action: 'Order Payment Confirmed', summary: (b) => `Payment/remittance status was changed to "${b?.status}"` },
    { pattern: /^PATCH \/orders\/:id\/cancel$/, action: 'Order Cancelled', summary: () => 'An order was cancelled and marked as returned to sender' },
    { pattern: /^PATCH \/orders\/:id\/follow-up$/, action: 'Follow-Up Scheduled', summary: (b) => `A follow-up reminder was set for ${b?.followUpDate || 'a future date'}` },

    // ORDER FORMS
    { pattern: /^POST \/order-forms$/, action: 'New Campaign Form Created', summary: (b) => `A new order capture form was created: "${b?.title || 'untitled'}"` },
    { pattern: /^GET \/order-forms$/, action: 'Campaign Forms List Viewed', summary: () => 'The list of campaign forms was viewed' },
    { pattern: /^GET \/order-forms\/:id$/, action: 'Campaign Form Viewed', summary: () => 'A campaign form was opened and viewed' },
    { pattern: /^PATCH \/order-forms\/:id$/, action: 'Campaign Form Updated', summary: () => 'A campaign form was edited' },
    { pattern: /^DELETE \/order-forms\/:id$/, action: 'Campaign Form Deleted', summary: () => 'A campaign form was permanently deleted' },
    { pattern: /^POST \/order-forms\/webhook$/, action: 'Order Received from Campaign Form', summary: (b) => `Customer "${b?.customerName || 'unknown'}" submitted or started a form — saved as "${b?.status || 'PENDING'}"` },

    // PRODUCTS
    { pattern: /^POST \/products$/, action: 'New Product Added', summary: (b) => `Product "${b?.name || 'unnamed'}" was added to the catalog at ₦${b?.sellingPrice?.toLocaleString() || 0}` },
    { pattern: /^GET \/products$/, action: 'Product Catalog Viewed', summary: () => 'The product catalog was viewed' },
    { pattern: /^GET \/products\/:id$/, action: 'Product Details Viewed', summary: () => 'A product listing was opened and viewed' },
    { pattern: /^PATCH \/products\/:id$/, action: 'Product Updated', summary: () => 'A product listing was edited' },
    { pattern: /^POST \/products\/:id\/offers$/, action: 'Product Offer Added', summary: (b) => `A new offer "${b?.name || 'unnamed'}" was added at ₦${b?.price?.toLocaleString() || 0}` },
    { pattern: /^PATCH \/products\/:id\/offers\/:id$/, action: 'Product Offer Updated', summary: () => 'A product offer was edited' },
    { pattern: /^DELETE \/products\/:id\/offers\/:id$/, action: 'Product Offer Removed', summary: () => 'A product offer was removed from a product' },

    // LOCATIONS
    { pattern: /^POST \/locations$/, action: 'New Office Location Added', summary: (b) => `Office location "${b?.name}" was added to the system` },
    { pattern: /^GET \/locations$/, action: 'Office Locations Viewed', summary: () => 'The list of office locations was viewed' },
    { pattern: /^PATCH \/locations\/:id$/, action: 'Office Location Updated', summary: () => 'An office location was updated' },
    { pattern: /^DELETE \/locations\/:id$/, action: 'Office Location Removed', summary: () => 'An office location was removed from the system' },

    // INVENTORY
    { pattern: /^GET \/inventory\/products$/, action: 'Inventory Viewed', summary: () => 'The inventory stock levels were viewed' },
    { pattern: /^POST \/inventory\/in$/, action: 'Stock Added to Inventory', summary: () => 'New stock was added to the inventory' },
    { pattern: /^POST \/inventory\/transfer$/, action: 'Stock Transferred Between Locations', summary: () => 'Stock was moved between office locations' },

    // LOGISTICS
    { pattern: /^GET \/logistics\/deliveries$/, action: 'Deliveries List Viewed', summary: () => 'The deliveries list was viewed' },
    { pattern: /^POST \/logistics\/deliveries\/assign$/, action: 'Delivery Assigned to Rider', summary: () => 'An order delivery was assigned to a delivery agent' },
    { pattern: /^PATCH \/logistics\/deliveries\/:id\/status$/, action: 'Delivery Status Updated', summary: (b) => `Delivery progress was updated to "${b?.status}"` },

    // FINANCE
    { pattern: /^GET \/finance\/profit$/, action: 'Profit Report Viewed', summary: () => 'The business profit and revenue report was viewed' },
    { pattern: /^GET \/finance\/wallet\/:id$/, action: 'Staff Wallet Balance Viewed', summary: () => "A staff member's commission wallet balance was viewed" },

    // ANALYTICS
    { pattern: /^GET \/analytics\/dashboard$/, action: 'Main Dashboard Viewed', summary: () => 'The main analytics dashboard was viewed' },
    { pattern: /^GET \/analytics\/cs-dashboard$/, action: 'Customer Service Dashboard Viewed', summary: () => 'The customer service performance dashboard was viewed' },
    { pattern: /^GET \/analytics\/me$/, action: 'Online Staff Status Checked', summary: () => 'The currently online staff members list was refreshed' },
    { pattern: /^GET \/analytics\/users\/:id$/, action: 'Staff Performance Report Viewed', summary: () => "A staff member's individual performance report was viewed" },

    // MEDIA BUYERS
    { pattern: /^POST \/media-buyers\/spend-log$/, action: 'Ad Spend Logged', summary: () => 'A media buyer logged their advertising spend' },
    { pattern: /^GET \/media-buyers\/dashboard$/, action: 'Media Buyer Dashboard Viewed', summary: () => 'The media buyer performance dashboard was viewed' },

    // COMMISSION RULES
    { pattern: /^GET \/commission-rules$/, action: 'Commission Rules Viewed', summary: () => 'The commission rules list was viewed' },
    { pattern: /^POST \/commission-rules$/, action: 'Commission Rule Created', summary: () => 'A new commission rule was set up' },

    // DEPARTMENTS & ROLES
    { pattern: /^GET \/departments$/, action: 'Departments List Viewed', summary: () => 'The departments list was viewed' },
    { pattern: /^POST \/departments$/, action: 'New Department Created', summary: (b) => `Department "${b?.name}" was created` },
    { pattern: /^PATCH \/departments\/:id$/, action: 'Department Updated', summary: () => 'A department was updated' },
    { pattern: /^DELETE \/departments\/:id$/, action: 'Department Deleted', summary: () => 'A department was deleted from the system' },
    { pattern: /^GET \/roles$/, action: 'Access Roles List Viewed', summary: () => 'The access roles list was viewed' },
    { pattern: /^POST \/roles$/, action: 'New Access Role Created', summary: (b) => `Access role "${b?.name}" was created` },

    // DEVICES
    { pattern: /^GET \/devices$/, action: 'Company Devices Viewed', summary: () => 'The company device inventory was viewed' },
    { pattern: /^POST \/devices\/:id\/assign$/, action: 'Device Assigned to Staff', summary: () => 'A company device was assigned to a staff member' },
    { pattern: /^POST \/devices\/:id\/unassign$/, action: 'Device Unassigned', summary: () => 'A company device was unassigned from a staff member' },
    { pattern: /^POST \/devices\/:id\/lock$/, action: 'Device Locked Remotely', summary: () => 'A company device was remotely locked for security' },
    { pattern: /^POST \/devices\/:id\/unlock$/, action: 'Device Unlocked', summary: () => 'A company device lock was removed' },
    { pattern: /^POST \/devices\/:id\/wipe$/, action: '⚠️ Device Wiped Remotely', summary: () => 'A company device was remotely wiped and reset to factory settings' },

    // AUDIT TRAIL
    { pattern: /^GET \/audit-trail$/, action: 'Activity Log Viewed', summary: () => 'The system activity log was viewed' },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(key)) {
      return { action: rule.action, summary: rule.summary(body) };
    }
  }

  // Readable fallback for unmapped routes
  return {
    action: `${method} Request`,
    summary: `A request was made to: ${url.split('?')[0]}`,
  };
}

@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, ip, user } = request;

    if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // Sanitise sensitive fields — never log credentials
      const sanitizedBody = { ...body };
      if (sanitizedBody.password) sanitizedBody.password = '[hidden]';
      if (sanitizedBody.newPass) sanitizedBody.newPass = '[hidden]';
      if (sanitizedBody.otp) sanitizedBody.otp = '[hidden]';

      return next.handle().pipe(
        tap({
          next: async () => {
            let userId = user?._id || null;
            let userEmail = user?.email;

            // For auth endpoints, req.user isn't set yet — fall back to body email
            if (url.includes('/auth/') && body?.email) {
              userEmail = body.email;
            }
            userEmail = userEmail || 'System';

            const { action, summary } = describeAction(method, url, sanitizedBody);

            await this.auditTrailService.logAction({
              userId,
              userEmail,
              action,
              details: { summary, performedBy: userEmail, status: 'Success' },
              ip,
            });
          },
          error: async (err) => {
            let userEmail = user?.email;
            if (url.includes('/auth/') && body?.email) userEmail = body.email;
            userEmail = userEmail || 'System';

            const { action } = describeAction(method, url, sanitizedBody);

            await this.auditTrailService.logAction({
              userId: user?._id || null,
              userEmail,
              action: `${action} — Failed`,
              details: {
                summary: `This action could not be completed. Reason: ${err.message || 'Unknown error'}`,
                performedBy: userEmail,
                status: 'Failed',
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

