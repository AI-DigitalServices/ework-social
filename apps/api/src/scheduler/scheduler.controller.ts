import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('scheduler')
@UseGuards(JwtGuard)
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
  updatePost(@Param('id') id: string, @Body() dto: Partial<CreatePostDto>) {
    return this.schedulerService.updatePost(id, dto);
  }

  @Delete('posts/:id')
  deletePost(@Param('id') id: string) {
    return this.schedulerService.deletePost(id);
  }

  @Post('posts/:id/retry')
  retryPost(@Param('id') id: string) {
    return this.schedulerService.retryPost(id);
  }

  @Post('posts/:id/publish-now')
  publishNow(@Param('id') id: string) {
    return this.schedulerService.publishNow(id);
  }

  @Get('posts/stats')
  getStats(@Query('workspaceId') workspaceId: string) {
    return this.schedulerService.getStats(workspaceId);
  }
}
