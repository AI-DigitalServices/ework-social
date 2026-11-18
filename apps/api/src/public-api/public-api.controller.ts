import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PublicApiService } from './public-api.service';
import { LeadCaptureService } from './lead-capture.service';
import { ApiKeyGuard } from './api-key.guard';
import { RequireScope } from './require-scope.decorator';

/**
 * Public REST API for automation tools (Make, n8n, Zapier, Pipedream, custom code).
 * Authenticated with a workspace API key: `Authorization: Bearer ewk_live_...`.
 * The workspace always comes from the key, never from the request.
 */
@Controller('public/v1')
@UseGuards(ApiKeyGuard)
export class PublicApiController {
  constructor(private api: PublicApiService) {}

  // Connection test: any valid key works.
  @Get('me')
  me(@Req() req: any) {
    return this.api.me(req.apiKey);
  }

  @Get('accounts')
  @RequireScope('posts:read')
  accounts(@Req() req: any) {
    return this.api.listAccounts(req.apiKey.workspaceId);
  }

  @Get('clients')
  @RequireScope('clients:read')
  listClients(@Req() req: any, @Query() q: any) {
    return this.api.listClients(req.apiKey.workspaceId, q || {});
  }

  @Get('clients/:id')
  @RequireScope('clients:read')
  getClient(@Req() req: any, @Param('id') id: string) {
    return this.api.getClient(req.apiKey.workspaceId, id);
  }

  @Post('clients')
  @RequireScope('clients:write')
  createClient(@Req() req: any, @Body() body: any) {
    return this.api.createClient(req.apiKey.workspaceId, body);
  }

  @Patch('clients/:id')
  @RequireScope('clients:write')
  updateClient(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.api.updateClient(req.apiKey.workspaceId, id, body);
  }

  @Post('clients/:id/stage')
  @HttpCode(200)
  @RequireScope('clients:write')
  moveStage(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.api.moveStage(req.apiKey.workspaceId, id, body);
  }

  @Post('clients/:id/notes')
  @RequireScope('clients:write')
  addNote(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.api.addNote(req.apiKey.workspaceId, id, body);
  }

  @Post('clients/:id/tasks')
  @RequireScope('clients:write')
  addTask(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.api.addTask(req.apiKey.workspaceId, id, body);
  }

  @Post('tasks/:id/complete')
  @HttpCode(200)
  @RequireScope('clients:write')
  completeTask(@Req() req: any, @Param('id') id: string) {
    return this.api.completeTask(req.apiKey.workspaceId, id);
  }

  @Get('posts')
  @RequireScope('posts:read')
  listPosts(@Req() req: any, @Query() q: any) {
    return this.api.listPosts(req.apiKey.workspaceId, q || {});
  }

  @Post('posts')
  @RequireScope('posts:write')
  createPost(@Req() req: any, @Body() body: any) {
    return this.api.createPost(req.apiKey.workspaceId, body);
  }
}

/**
 * Public website-form endpoint. No API key: the private token in the URL is the
 * credential, and it can only ever create or annotate contacts in its workspace.
 */
@Controller('public/v1/capture')
export class CaptureController {
  constructor(private leads: LeadCaptureService) {}

  @Post(':token')
  async capture(@Param('token') token: string, @Body() body: any, @Req() req: any, @Res() res: Response) {
    const result = await this.leads.capture(token, body);
    const isBrowserForm = String(req.headers['content-type'] || '').includes('application/x-www-form-urlencoded');
    // A classic HTML form post lands on the owner's thank-you page (set per link, never from the request).
    if (isBrowserForm && result.redirectUrl) return res.redirect(303, result.redirectUrl);
    return res.status(200).json({ ok: true, created: result.created });
  }
}
