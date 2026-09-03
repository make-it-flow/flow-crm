import { Migration } from '@mikro-orm/migrations';

export class Migration20260903140000_research extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "research_runs" add column "cursor_model" text null;`)
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "research_runs" drop column "cursor_model";`)
  }

}
