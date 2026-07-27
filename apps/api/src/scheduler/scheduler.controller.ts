import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';

@Controller('scheduler')
@UseGuards(JwtGuard, WorkspaceMemberGuard)
export class SchedulerController {
  constructor(private schedulerService: SchedulerService) {}

  @Get('posts')
  getPosts(@Query('workspaceId') workspaceId: string) {
    return this.schedulerService.getPosts(workspaceId);
  }

  @Post('posts')
  createPost(@Body() dto: CreatePostDto) {
    return this.schedulerService.createPost(dto);
  }

  @Patch('posts/:id')
  updatePost(@Param('id') id: string, @Body() dto: Partial<CreatePostDto>, @Request() req: any) {
    return this.schedulerService.updatePost(id, dto, req.user.sub);
  }

  @Delete('posts/:id')
  deletePost(@Param('id') id: string, @Request() req: any) {
    return this.schedulerService.deletePost(id, req.user.sub);
  }

  @Post('posts/:id/retry')
  retryPost(@Param('id') id: string, @Request() req: any) {
    return this.schedulerService.retryPost(id, req.user.sub);
  }

  @Post('posts/:id/publish-now')
  publishNow(@Param('id') id: string, @Request() req: any) {
    return this.schedulerService.publishNow(id, req.user.sub);
  }

  @Get('posts/stats')
  getStats(@Query('workspaceId') workspaceId: string) {
    return this.schedulerService.getStats(workspaceId);
  }
}
