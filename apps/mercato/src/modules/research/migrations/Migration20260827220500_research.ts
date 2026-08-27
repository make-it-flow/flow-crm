import { Migration } from '@mikro-orm/migrations';

export class Migration20260827220500_research extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "research_runs" add column "annual_revenue" text null;`)
    this.addSql(`alter table "research_runs" add column "profit" text null;`)
    this.addSql(`alter table "research_runs" add column "nip" text null;`)
    this.addSql(`alter table "research_runs" add column "krs" text null;`)
    this.addSql(`alter table "research_runs" add column "related_companies" text null;`)
    this.addSql(`
      update "research_runs"
      set
        "annual_revenue" = case
          when jsonb_typeof("brief_json"->'annualRevenue') = 'string'
          then nullif(btrim("brief_json"->>'annualRevenue'), '')
          else "annual_revenue"
        end,
        "profit" = case
          when jsonb_typeof("brief_json"->'profit') = 'string'
          then nullif(btrim("brief_json"->>'profit'), '')
          else "profit"
        end,
        "nip" = case
          when jsonb_typeof("brief_json"->'nip') = 'string'
          then nullif(btrim("brief_json"->>'nip'), '')
          else "nip"
        end,
        "krs" = case
          when jsonb_typeof("brief_json"->'krs') = 'string'
          then nullif(btrim("brief_json"->>'krs'), '')
          else "krs"
        end,
        "related_companies" = case
          when jsonb_typeof("brief_json"->'relatedCompanies') = 'string'
          then nullif(btrim("brief_json"->>'relatedCompanies'), '')
          else "related_companies"
        end
      where "brief_json" is not null;
    `)
    this.addSql(`alter table "research_runs" drop column "fit_verdict";`)
    this.addSql(`alter table "research_runs" drop column "talking_points";`)
    this.addSql(`alter table "research_runs" drop column "call_script";`)
    this.addSql(`alter table "research_runs" drop column "email_draft";`)
    this.addSql(`alter table "research_runs" drop column "brief_json";`)
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "research_runs" add column "fit_verdict" text null;`)
    this.addSql(`alter table "research_runs" add column "talking_points" text null;`)
    this.addSql(`alter table "research_runs" add column "call_script" text null;`)
    this.addSql(`alter table "research_runs" add column "email_draft" text null;`)
    this.addSql(`alter table "research_runs" add column "brief_json" jsonb null;`)
    this.addSql(`
      update "research_runs"
      set "brief_json" = jsonb_strip_nulls(jsonb_build_object(
        'annualRevenue', "annual_revenue",
        'profit', "profit",
        'nip', "nip",
        'krs', "krs",
        'relatedCompanies', "related_companies"
      ))
      where "annual_revenue" is not null
         or "profit" is not null
         or "nip" is not null
         or "krs" is not null
         or "related_companies" is not null;
    `)
    this.addSql(`alter table "research_runs" drop column "annual_revenue";`)
    this.addSql(`alter table "research_runs" drop column "profit";`)
    this.addSql(`alter table "research_runs" drop column "nip";`)
    this.addSql(`alter table "research_runs" drop column "krs";`)
    this.addSql(`alter table "research_runs" drop column "related_companies";`)
  }

}
