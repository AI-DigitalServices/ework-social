import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PostHog } from 'posthog-node';

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private client: PostHog | null = null;

  constructor() {
    if (process.env.POSTHOG_API_KEY) {
      this.client = new PostHog(process.env.POSTHOG_API_KEY, {
        host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      });
    }
  }

  capture(userId: string, event: string, properties?: Record<string, any>) {
    if (!this.client) return;
    this.client.capture({ distinctId: userId, event, properties });
  }

  async onModuleDestroy() {
    if (this.client) await this.client.shutdown();
  }
}
