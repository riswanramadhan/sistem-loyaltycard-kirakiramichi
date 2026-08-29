import { createClient } from "@/lib/supabase/server";

type AdminClient = Awaited<ReturnType<typeof createClient>>;
type QueryError = { message?: string; code?: string } | null;

type ProfileRow = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  role: string | null;
  marketing_consent?: boolean | null;
  marketing_consent_at?: string | null;
  date_of_birth?: string | null;
  terms_accepted_at?: string | null;
  terms_version?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  email?: string | null;
};

type MemberProgramRow = {
  id: string;
  program_id: string;
  user_id: string;
  status: string;
  completed_cycles: number;
  joined_at: string | null;
  completed_at: string | null;
};

type MemberCardRow = {
  id: string;
  member_program_id: string;
  card_definition_id: string;
  sequence_no: number;
  status: string;
  stamps_count: number;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CardDefinitionRow = {
  id: string;
  program_id: string;
  sequence_no: number;
  title: string | null;
  description: string | null;
  reward_title: string | null;
  reward_description: string | null;
  reward_terms: string | null;
  reward_expiry_days: number | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type StampRequestRow = {
  id: string;
  member_card_id: string;
  user_id: string;
  requested_count: number;
  approved_count: number | null;
  status: string;
  customer_note: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
};

type StampEventRow = {
  id: string;
  member_card_id: string;
  user_id: string;
  stamp_request_id: string | null;
  event_type: string;
  quantity: number;
  created_by: string;
  reason: string | null;
  created_at: string | null;
};

type RewardRow = {
  id: string;
  member_card_id: string;
  user_id: string;
  status: string;
  cycle_no: number;
  available_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  redeemed_by: string | null;
  note: string | null;
};

type ProgramRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  total_cards: number;
  stamps_per_card: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type AdminRequestRpcRow = {
  id: string;
  member_card_id: string;
  user_id: string;
  requested_count: number;
  approved_count: number | null;
  status: string;
  customer_note: string | null;
  admin_note: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  card_sequence_no: number;
  stamps_count: number;
  card_title: string | null;
};

type AdminCustomerRpcRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  program_status: string;
  joined_at: string | null;
  active_card_id: string | null;
  active_card_sequence: number | null;
  active_card_stamps: number | null;
  rewards_available: number;
  rewards_redeemed: number;
  last_activity: string | null;
};

type CustomerDetailRpcCustomer = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  role: string | null;
  marketing_consent: boolean | null;
  marketing_consent_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminRequestView = {
  id: string;
  userId: string;
  customerName: string;
  whatsapp: string | null;
  email: string | null;
  memberCardId: string;
  cardSequence: number;
  cardTitle: string;
  stampsCount: number;
  requestedCount: number;
  approvedCount: number | null;
  status: string;
  customerNote: string | null;
  adminNote: string | null;
  reviewerName: string | null;
  requestedAt: string | null;
  reviewedAt: string | null;
};

export type AdminCustomerView = {
  id: string;
  fullName: string;
  whatsapp: string | null;
  email: string | null;
  joinedAt: string | null;
  programStatus: string;
  activeCardSequence: number | null;
  activeCardTitle: string | null;
  activeStamps: number;
  availableRewards: number;
  lastActivityAt: string | null;
};

export type CustomerDetailView = {
  profile: ProfileRow;
  program: (MemberProgramRow & { programName: string }) | null;
  cards: Array<MemberCardRow & { definition: CardDefinitionRow | null }>;
  requests: Array<StampRequestRow & { cardSequence: number; reviewerName: string | null }>;
  events: Array<StampEventRow & { cardSequence: number; actorName: string | null }>;
  rewards: Array<RewardRow & { cardSequence: number; rewardTitle: string }>;
};

export type AuditEventView = StampEventRow & {
  customerName: string;
  actorName: string;
  cardSequence: number;
  cardTitle: string;
};

function rows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function failOnQuery(error: QueryError, context: string) {
  if (!error) return;
  console.error(`[admin-read:${context}]`, { code: error.code, message: error.message });
  throw new Error("Admin data could not be loaded.");
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function profileMap(profiles: ProfileRow[]) {
  return new Map(profiles.map((profile) => [profile.id, profile]));
}

async function getProfiles(client: AdminClient, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await client.from("profiles").select("*").in("id", ids);
  failOnQuery(error, "profiles");
  return rows<ProfileRow>(data);
}

async function getCards(client: AdminClient, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await client
    .from("member_cards")
    .select("id, member_program_id, card_definition_id, sequence_no, status, stamps_count, completed_at, created_at, updated_at")
    .in("id", ids);
  failOnQuery(error, "member-cards");
  return rows<MemberCardRow>(data);
}

async function getDefinitions(client: AdminClient, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await client
    .from("loyalty_card_definitions")
    .select("id, program_id, sequence_no, title, description, reward_title, reward_description, reward_terms, reward_expiry_days, is_active, created_at, updated_at")
    .in("id", ids);
  failOnQuery(error, "card-definitions");
  return rows<CardDefinitionRow>(data);
}

export async function getAdminRequests(status: "pending" | "approved" | "rejected", limit = 50) {
  const client = await createClient();
  const { data, error } = await client.rpc("list_admin_stamp_requests", {
    p_status: status,
    p_limit: limit,
    p_offset: 0,
  });
  failOnQuery(error, "stamp-requests-rpc");
  const requests = rows<AdminRequestRpcRow>(record(data).data);
  const reviewers = profileMap(await getProfiles(client, unique(requests.map((request) => request.reviewed_by))));

  return requests.map<AdminRequestView>((request) => {
    const reviewer = request.reviewed_by ? reviewers.get(request.reviewed_by) : null;
    return {
      id: request.id,
      userId: request.user_id,
      customerName: request.full_name?.trim() || "Customer tanpa nama",
      whatsapp: request.whatsapp,
      email: request.email,
      memberCardId: request.member_card_id,
      cardSequence: request.card_sequence_no,
      cardTitle: request.card_title?.trim() || `Loyalty Card ${request.card_sequence_no}`,
      stampsCount: request.stamps_count,
      requestedCount: request.requested_count,
      approvedCount: request.approved_count,
      status: request.status,
      customerNote: request.customer_note,
      adminNote: request.admin_note,
      reviewerName: reviewer?.full_name?.trim() || null,
      requestedAt: request.requested_at,
      reviewedAt: request.reviewed_at,
    };
  });
}

export async function getAdminMetrics() {
  const client = await createClient();
  const { data, error } = await client.rpc("get_admin_dashboard_metrics");
  failOnQuery(error, "dashboard-metrics-rpc");
  const metrics = record(data);
  return {
    totalMembers: Number(metrics.total_members ?? 0),
    pendingRequests: Number(metrics.pending_requests ?? 0),
    approvedToday: Number(metrics.approved_today ?? 0),
    completedCards: Number(metrics.completed_cards ?? 0),
    rewardsRedeemed: Number(metrics.rewards_redeemed ?? 0),
  };
}

export async function getAdminCustomers(searchQuery: string) {
  const client = await createClient();
  const { data, error } = await client.rpc("search_admin_customers", {
    p_query: searchQuery || null,
    p_limit: 100,
    p_offset: 0,
  });
  failOnQuery(error, "customer-search-rpc");
  const customers = rows<AdminCustomerRpcRow>(record(data).data);
  const customerIds = customers.map((customer) => customer.user_id);
  const { data: rewardData, error: rewardError } = customerIds.length
    ? await client
        .from("reward_redemptions")
        .select("user_id, expires_at")
        .in("user_id", customerIds)
        .eq("status", "available")
    : { data: [], error: null };
  failOnQuery(rewardError, "customer-redeemable-rewards");
  const now = Date.now();
  const redeemableRewardsByUser = rows<{ user_id: string; expires_at: string | null }>(rewardData).reduce(
    (counts, reward) => {
      if (reward.expires_at && new Date(reward.expires_at).getTime() <= now) return counts;
      counts.set(reward.user_id, (counts.get(reward.user_id) ?? 0) + 1);
      return counts;
    },
    new Map<string, number>(),
  );
  return customers.map<AdminCustomerView>((customer) => {
    return {
      id: customer.user_id,
      fullName: customer.full_name?.trim() || "Customer tanpa nama",
      whatsapp: customer.whatsapp,
      email: customer.email,
      joinedAt: customer.joined_at,
      programStatus: customer.program_status,
      activeCardSequence: customer.active_card_sequence,
      activeCardTitle: customer.active_card_sequence ? `Loyalty Card ${customer.active_card_sequence}` : null,
      activeStamps: customer.active_card_stamps ?? 0,
      availableRewards: redeemableRewardsByUser.get(customer.user_id) ?? 0,
      lastActivityAt: customer.last_activity,
    };
  });
}

export async function getAdminCustomerDetail(userId: string): Promise<CustomerDetailView | null> {
  const client = await createClient();
  const { data: rpcData, error: rpcError } = await client.rpc("get_admin_customer_detail", { p_user_id: userId });
  if (rpcError?.code === "P0002") return null;
  failOnQuery(rpcError, "customer-detail-rpc");
  const rpcCustomer = record(record(rpcData).customer) as CustomerDetailRpcCustomer;
  const { data: profileData, error: profileError } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
  failOnQuery(profileError, "customer-detail-profile");
  if (!profileData) return null;
  const profile = {
    ...(profileData as ProfileRow),
    email: rpcCustomer.email ?? null,
    marketing_consent: rpcCustomer.marketing_consent,
    marketing_consent_at: rpcCustomer.marketing_consent_at,
  } satisfies ProfileRow;
  if (profile.role !== "customer") return null;

  const [programResult, requestResult, eventResult, rewardResult] = await Promise.all([
    client
      .from("member_programs")
      .select("id, program_id, user_id, status, completed_cycles, joined_at, completed_at")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false }),
    client
      .from("stamp_requests")
      .select("id, member_card_id, user_id, requested_count, approved_count, status, customer_note, admin_note, reviewed_by, requested_at, reviewed_at")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false }),
    client
      .from("stamp_events")
      .select("id, member_card_id, user_id, stamp_request_id, event_type, quantity, created_by, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    client
      .from("reward_redemptions")
      .select("id, member_card_id, user_id, status, cycle_no, available_at, expires_at, redeemed_at, redeemed_by, note")
      .eq("user_id", userId)
      .order("available_at", { ascending: false }),
  ]);
  failOnQuery(programResult.error, "customer-detail-program");
  failOnQuery(requestResult.error, "customer-detail-requests");
  failOnQuery(eventResult.error, "customer-detail-events");
  failOnQuery(rewardResult.error, "customer-detail-rewards");

  const programs = rows<MemberProgramRow>(programResult.data);
  const requests = rows<StampRequestRow>(requestResult.data);
  const events = rows<StampEventRow>(eventResult.data);
  const rewards = rows<RewardRow>(rewardResult.data);
  const { data: cardsData, error: cardsError } = programs.length
    ? await client
        .from("member_cards")
        .select("id, member_program_id, card_definition_id, sequence_no, status, stamps_count, completed_at, created_at, updated_at")
        .in("member_program_id", programs.map((program) => program.id))
        .order("sequence_no", { ascending: true })
    : { data: [], error: null };
  failOnQuery(cardsError, "customer-detail-cards");
  const cards = rows<MemberCardRow>(cardsData);
  const definitions = await getDefinitions(client, unique(cards.map((card) => card.card_definition_id)));
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  const actorIds = unique([
    ...requests.map((request) => request.reviewed_by),
    ...events.map((event) => event.created_by),
    ...rewards.map((reward) => reward.redeemed_by),
  ]);
  const actors = profileMap(await getProfiles(client, actorIds));

  let program: CustomerDetailView["program"] = null;
  const selectedProgram = programs[0];
  if (selectedProgram) {
    const { data: programData, error: programError } = await client
      .from("loyalty_programs")
      .select("id, name")
      .eq("id", selectedProgram.program_id)
      .maybeSingle();
    failOnQuery(programError, "customer-detail-program-name");
    const namedProgram = programData as { id: string; name: string } | null;
    program = { ...selectedProgram, programName: namedProgram?.name ?? "Kira Kira Michi Loyalty" };
  }

  return {
    profile,
    program,
    cards: cards.map((card) => ({ ...card, definition: definitionsById.get(card.card_definition_id) ?? null })),
    requests: requests.map((request) => ({
      ...request,
      cardSequence: cardsById.get(request.member_card_id)?.sequence_no ?? 0,
      reviewerName: request.reviewed_by ? actors.get(request.reviewed_by)?.full_name ?? null : null,
    })),
    events: events.map((event) => ({
      ...event,
      cardSequence: cardsById.get(event.member_card_id)?.sequence_no ?? 0,
      actorName: actors.get(event.created_by)?.full_name ?? null,
    })),
    rewards: rewards.map((reward) => {
      const card = cardsById.get(reward.member_card_id);
      const definition = card ? definitionsById.get(card.card_definition_id) : null;
      return {
        ...reward,
        cardSequence: card?.sequence_no ?? 0,
        rewardTitle: definition?.reward_title?.trim() || `Reward Card ${card?.sequence_no ?? "–"}`,
      };
    }),
  };
}

export async function getAdminProgram() {
  const client = await createClient();
  const { data, error } = await client
    .from("loyalty_programs")
    .select("id, slug, name, description, total_cards, stamps_per_card, is_active, created_at, updated_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  failOnQuery(error, "program");
  if (!data) return null;
  const program = data as ProgramRow;
  const { data: definitionData, error: definitionError } = await client
    .from("loyalty_card_definitions")
    .select("id, program_id, sequence_no, title, description, reward_title, reward_description, reward_terms, reward_expiry_days, is_active, created_at, updated_at")
    .eq("program_id", program.id)
    .order("sequence_no", { ascending: true });
  failOnQuery(definitionError, "program-definitions");
  return { program, definitions: rows<CardDefinitionRow>(definitionData) };
}

export async function getAuditEvents(limit = 250) {
  const client = await createClient();
  const { data, error } = await client
    .from("stamp_events")
    .select("id, member_card_id, user_id, stamp_request_id, event_type, quantity, created_by, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  failOnQuery(error, "audit-events");
  const events = rows<StampEventRow>(data);
  const [profiles, cards] = await Promise.all([
    getProfiles(client, unique(events.flatMap((event) => [event.user_id, event.created_by]))),
    getCards(client, unique(events.map((event) => event.member_card_id))),
  ]);
  const definitions = await getDefinitions(client, unique(cards.map((card) => card.card_definition_id)));
  const profilesById = profileMap(profiles);
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));

  return events.map<AuditEventView>((event) => {
    const card = cardsById.get(event.member_card_id);
    const definition = card ? definitionsById.get(card.card_definition_id) : null;
    return {
      ...event,
      customerName: profilesById.get(event.user_id)?.full_name?.trim() || "Customer tanpa nama",
      actorName: profilesById.get(event.created_by)?.full_name?.trim() || "Sistem",
      cardSequence: card?.sequence_no ?? 0,
      cardTitle: definition?.title?.trim() || `Loyalty Card ${card?.sequence_no ?? "–"}`,
    };
  });
}
