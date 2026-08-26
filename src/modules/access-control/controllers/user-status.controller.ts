import { Controller, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UserStatusService } from '../services/user-status.service';
import { ChangeStatusDto } from '../dto/change-status.dto';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { PermissionGuard } from '../guards/permission.guard';

@UseGuards(PermissionGuard)
@Controller('users/:id/status')
export class UserStatusController {
  constructor(private readonly userStatusService: UserStatusService) {}

  @RequirePermission('access-control:manage')
  @Patch()
  changeStatus(@Param('id') id: string, @Body() changeStatusDto: ChangeStatusDto, @Request() req: any) {
    return this.userStatusService.changeStatus(id, changeStatusDto, req.user._id);
  }
}
