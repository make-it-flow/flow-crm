import { Migration } from '@mikro-orm/migrations';

export class Migration20260828003600_research extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "research_runs" add column "industry" text null;`)
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "research_runs" drop column "industry";`)
  }

}
