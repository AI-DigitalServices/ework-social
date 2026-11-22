import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';
import { WriterRoleGuard } from '../common/role.guards';
import { MobileCreateService } from './mobile-create.service';
import { IdeaToPostDto, SaveIdeaDto, SuggestIdeaDto, UpdateIdeaDto } from './dto/create.dto';

/**
 * "Give us an idea" for the mobile app, served at /api/mobile/v1.
 * Everything here needs workspace membership and a writer role (Owner, Admin, Editor).
 */
@Controller('mobile/v1/workspaces/:workspaceId')
@UseGuards(JwtGuard, WorkspaceMemberGuard, WriterRoleGuard)
export class MobileCreateController {
  constructor(private create: MobileCreateService) {}

  @Post('create/suggest')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  suggest(@Param('workspaceId') workspaceId: string, @Body() dto: SuggestIdeaDto) {
    return this.create.suggest(workspaceId, dto);
  }

  @Get('create/usage')
  usage(@Param('workspaceId') workspaceId: string) {
    return this.create.usage(workspaceId);
  }

  @Get('create/video-usage')
  videoUsage(@Param('workspaceId') workspaceId: string) {
    return this.create.videoUsage(workspaceId);
  }

  @Get('ideas')
  list(@Param('workspaceId') workspaceId: string) {
    return this.create.listIdeas(workspaceId);
  }

  @Post('ideas')
  save(@Param('workspaceId') workspaceId: string, @Req() req: any, @Body() dto: SaveIdeaDto) {
    return this.create.saveIdea(workspaceId, req.user.sub, dto);
  }

  @Patch('ideas/:id')
  update(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() dto: UpdateIdeaDto) {
    return this.create.updateIdea(workspaceId, id, dto.content);
  }

  @Delete('ideas/:id')
  remove(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.create.removeIdea(workspaceId, id);
  }

  @Post('ideas/:id/post')
  toPost(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: IdeaToPostDto,
  ) {
    return this.create.ideaToPost(workspaceId, req.user.sub, id, dto);
  }
}
