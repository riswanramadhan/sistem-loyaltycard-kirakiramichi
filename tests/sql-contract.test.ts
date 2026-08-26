import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = (name: string) =>
  readFileSync(join(process.cwd(), "supabase", "migrations", name), "utf8").toLowerCase();

const schema = migration("20260814000100_loyalty_schema.sql");
const security = migration("20260814000200_loyalty_security.sql");
const mutations = migration("20260814000300_loyalty_mutations.sql");
const reads = migration("20260814000400_loyalty_reads.sql");
const realtime = migration("20260814000500_loyalty_realtime.sql");
const adminAccounts = migration("20260820000100_admin_account_management.sql");
const realtimeAndAdminTransition = migration("20260826000100_realtime_and_admin_transition.sql");

describe("Supabase migration contract", () => {
  it("defines every required business table", () => {
    for (const table of [
      "profiles",
      "loyalty_programs",
      "loyalty_card_definitions",
      "member_programs",
      "member_cards",
      "stamp_requests",
      "stamp_events",
      "reward_redemptions",
    ]) {
      expect(schema).toContain(`create table public.${table}`);
      expect(security).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("enforces the fixed six-card/eight-stamp program and uniqueness rules", () => {
    expect(schema).toContain("total_cards = 6 and stamps_per_card = 8");
    expect(schema).toContain("member_cards_one_active_per_program_idx");
    expect(schema).toContain("stamp_requests_one_pending_per_user_idx");
    expect(schema).toContain("stamps_count between 0 and 8");
    expect(schema).toContain("loyalty_card_definitions_fixed_mvp_active");
  });

  it("keeps raw privileged writes unavailable to authenticated clients", () => {
    expect(security).toContain("revoke all on table public.member_cards from anon, authenticated");
    expect(security).toContain("revoke all on table public.stamp_events from anon, authenticated");
    expect(security).toContain("grant update (full_name, whatsapp, marketing_consent)");
    expect(security).not.toContain("grant update on table public.member_cards to authenticated");
    expect(security).not.toContain("grant insert on table public.stamp_events to authenticated");
  });

  it("exposes the exact authenticated mutation RPCs", () => {
    for (const fn of [
      "update_my_profile",
      "join_loyalty_program",
      "request_stamps",
      "review_stamp_request",
      "adjust_member_stamps",
      "redeem_reward",
      "admin_update_card_definition",
      "update_loyalty_program_details",
    ]) {
      expect(mutations).toContain(`create or replace function public.${fn}`);
      expect(mutations).toContain(`grant execute on function public.${fn}`);
    }
    expect(mutations.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(8);
  });

  it("locks mutable rows and writes the immutable ledger during review", () => {
    const reviewStart = mutations.indexOf("create or replace function public.review_stamp_request");
    const adjustmentStart = mutations.indexOf("create or replace function public.adjust_member_stamps");
    const reviewBody = mutations.slice(reviewStart, adjustmentStart);
    expect(reviewBody).toContain("for update");
    expect(reviewBody).toContain("insert into public.stamp_events");
    expect(reviewBody).toContain("stamp_request_already_reviewed");
    expect(reviewBody).toContain("_advance_loyalty_after_completion");
    expect(schema).toContain("stamp_events_are_immutable");
  });

  it("enforces customer roles, reward expiry, and safe completion reversal", () => {
    expect(mutations.match(/customer_role_required/g)?.length).toBeGreaterThanOrEqual(2);
    expect(mutations).toContain("loyalty_program_not_active");
    expect(mutations).toContain("for share of lp");
    expect(schema).toContain("expires_at timestamptz");
    expect(mutations).toContain("reward_expired");
    expect(mutations).toContain("completion_reversed");
    expect(mutations).toContain("completed_card_reward_not_available_for_reversal");
    expect(mutations).toContain("next_member_card_has_progress");
    expect(mutations).toContain("next_member_card_has_activity");
  });

  it("provides role-checked admin reads without exposing auth email directly", () => {
    for (const fn of [
      "get_admin_dashboard_metrics",
      "list_admin_stamp_requests",
      "search_admin_customers",
      "get_admin_customer_detail",
    ]) {
      expect(reads).toContain(`create or replace function public.${fn}`);
    }
    expect(reads.match(/admin_access_required/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("publishes loyalty state and admin-edited program data as realtime hints", () => {
    for (const table of ["member_cards", "stamp_requests", "reward_redemptions"]) {
      expect(realtime).toContain(`alter table public.${table} replica identity full`);
      expect(realtime).toContain(`alter publication supabase_realtime add table public.${table}`);
    }
    expect(realtime).not.toContain("add table public.profiles");
    expect(realtime).toContain("supabase_realtime_publication_missing");
    for (const table of ["stamp_events", "loyalty_programs", "loyalty_card_definitions"]) {
      expect(realtimeAndAdminTransition).toContain(`alter table public.${table} replica identity full`);
    }
    expect(realtimeAndAdminTransition).toContain("alter publication supabase_realtime add table public.%i");
  });

  it("keeps admin creation and complete customer deletion role checked", () => {
    expect(adminAccounts).toContain("create or replace function public.admin_promote_account");
    expect(adminAccounts).toContain("create or replace function public.get_admin_accounts");
    expect(adminAccounts).toContain("create or replace function public.admin_prepare_customer_deletion");
    expect(adminAccounts).toContain("create or replace function public._purge_customer_before_auth_delete");
    expect(adminAccounts.match(/admin_access_required/g)?.length).toBeGreaterThanOrEqual(3);
    expect(adminAccounts).toContain("delete from public.reward_redemptions");
    expect(adminAccounts).toContain("delete from public.stamp_events");
    expect(adminAccounts).toContain("delete from public.stamp_requests");
    expect(adminAccounts).toContain("delete from public.member_programs");
    expect(adminAccounts).toContain("before delete on auth.users");
    expect(adminAccounts).toContain("only_customer_accounts_can_be_deleted");
    expect(realtimeAndAdminTransition).toContain("admin_accounts_require_verified_replacement");
    expect(realtimeAndAdminTransition).toContain("update public.stamp_requests set reviewed_by");
    expect(realtimeAndAdminTransition).toContain("update public.stamp_events set created_by");
    expect(realtimeAndAdminTransition).toContain("update public.reward_redemptions set redeemed_by");
    expect(realtimeAndAdminTransition).toContain("sync_available_reward_expiry");
  });

  it("ships the full database behavior test suite", () => {
    const pgTap = readFileSync(
      join(process.cwd(), "supabase", "tests", "database", "loyalty_database.test.sql"),
      "utf8",
    ).toLowerCase();
    expect(pgTap).toContain("extensions.plan(108)");
    expect(pgTap).toContain("double approval is rejected");
    expect(pgTap).toContain("card six completion completes the member program");
    expect(pgTap).toContain("customer cannot read another profile");
    expect(pgTap).toContain("an expired reward cannot be redeemed");
    expect(pgTap).toContain("reversal reopens the completed card with corrected progress");
    expect(pgTap).toContain("customer stamp requests and ledger are deleted");
    expect(pgTap).toContain("edited expiry days propagate to the customer available reward");
    expect(pgTap).toContain("replacement admin owns every transferred request, ledger, and reward audit reference");
  });
});
