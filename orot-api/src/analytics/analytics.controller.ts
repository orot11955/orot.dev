import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Public / Analytics')
@Controller('public/analytics')
export class PublicAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('visit')
  @ApiOperation({ summary: 'Record a public page visit' })
  recordVisit(
    @Req() req: Request,
    @Body() body: { path?: string; referer?: string },
  ) {
    return this.analyticsService.recordPageVisit(req, body.path, body.referer);
  }
}

@ApiTags('Studio / Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
@Controller('studio/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard analytics stats' })
  getStats() {
    return this.analyticsService.getStats();
  }
}
