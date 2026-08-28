import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { RecordAssetDto } from './dto/record-asset.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';

/**
 * Creative Hub (AI OS v2, section 13.1). File bytes never pass through this
 * API — the frontend uploads directly to the Supabase "media" bucket via
 * uploadMedia() (apps/web/src/lib/supabase.ts) and only sends us the
 * resulting public URL + metadata to record, tag, and embed.
 */
@Controller('assets')
@UseGuards(JwtGuard, WorkspaceMemberGuard)
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Post(':workspaceId')
  record(@Param('workspaceId') workspaceId: string, @Body() dto: RecordAssetDto) {
    return this.assetsService.recordUpload(workspaceId, dto);
  }

  @Get(':workspaceId')
  list(
    @Param('workspaceId') workspaceId: string,
    @Query('kind') kind?: string,
    @Query('clientId') clientId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('tag') tag?: string,
  ) {
    return this.assetsService.list(workspaceId, { kind, clientId, campaignId, tag });
  }

  @Get(':workspaceId/search')
  search(@Param('workspaceId') workspaceId: string, @Query('q') q?: string) {
    return this.assetsService.search(workspaceId, q || '');
  }

  @Delete(':workspaceId/:id')
  remove(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.assetsService.remove(workspaceId, id);
  }
}
