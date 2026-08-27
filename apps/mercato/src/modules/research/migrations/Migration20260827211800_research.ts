import { Migration } from '@mikro-orm/migrations';

export class Migration20260827211800_research extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "research_runs" add column "contact_person" jsonb null;`)
    this.addSql(`alter table "research_runs" add column "decision_maker" jsonb null;`)
  }

}
