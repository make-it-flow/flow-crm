import { Migration } from '@mikro-orm/migrations';

export class Migration20260827184847_research extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "research_runs" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "company_id" uuid not null, "company_name" text null, "website_url" text null, "status" text not null default 'pending', "main_insight" text null, "main_insight_source" text null, "action_items" text null, "specific_problems" jsonb null, "top_news" jsonb null, "generic_problems" jsonb null, "timeline" jsonb null, "company_description" text null, "estimated_headcount" text null, "public_tenders_participates" boolean null, "public_tender_sources" jsonb null, "fit_verdict" text null, "talking_points" text null, "call_script" text null, "email_draft" text null, "error_message" text null, "started_at" timestamptz null, "finished_at" timestamptz null, "brief_json" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "research_runs_scope_company_status_idx" on "research_runs" ("tenant_id", "organization_id", "company_id", "status");`);
    this.addSql(`create index "research_runs_scope_company_updated_idx" on "research_runs" ("tenant_id", "organization_id", "company_id", "updated_at");`);
  }

}
