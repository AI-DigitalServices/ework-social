import {
  Controller, Post, Get, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('approvals')
export class ApprovalController {
  constructor(private approvalService: ApprovalService) {}

  // Agency: send post for approval
  @Post('send')
  @UseGuards(JwtGuard)
  sendForApproval(@Body() body: {
    postId: string;
    workspaceId: string;
    clientEmail: string;
    clientName: string;
    clientId?: string;
  }) {
    return this.approvalService.sendForApproval(
      body.postId,
      body.workspaceId,
      body.clientEmail,
      body.clientName,
      body.clientId,
    );
  }

  // Agency: get all approvals for workspace
  @Get('workspace')
  @UseGuards(JwtGuard)
  getWorkspaceApprovals(@Query('workspaceId') workspaceId: string) {
    return this.approvalService.getWorkspaceApprovals(workspaceId);
  }

  // Public: client views approval page (no auth needed)
  @Get('review/:token')
  getApprovalByToken(@Param('token') token: string) {
    return this.approvalService.getApprovalByToken(token);
  }

  // Public: client approves post
  @Patch('approve/:token')
  approvePost(@Param('token') token: string) {
    return this.approvalService.approvePost(token);
  }

  // Public: client requests revision
  @Patch('revision/:token')
  requestRevision(
    @Param('token') token: string,
    @Body() body: { revisionNote: string },
  ) {
    return this.approvalService.requestRevision(token, body.revisionNote);
  }
}
