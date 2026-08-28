import { Migration } from '@mikro-orm/migrations';

export class Migration20260828060000_research extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "research_runs" add column "provider_agent_id" text null;`)
    this.addSql(`alter table "research_runs" add column "provider_run_id" text null;`)
    this.addSql(`alter table "research_runs" add column "deadline_at" timestamptz null;`)
    this.addSql(`alter table "research_runs" add column "deadline_extended_at" timestamptz null;`)
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "research_runs" drop column "deadline_extended_at";`)
    this.addSql(`alter table "research_runs" drop column "deadline_at";`)
    this.addSql(`alter table "research_runs" drop column "provider_run_id";`)
    this.addSql(`alter table "research_runs" drop column "provider_agent_id";`)
  }

}
