import assert from "node:assert/strict";
import test from "node:test";

const localStore = new Map<string, string>();
const sessionStore = new Map<string, string>();

globalThis.window = {
  localStorage: {
    getItem(key: string) {
      return localStore.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      localStore.set(key, value);
    },
    removeItem(key: string) {
      localStore.delete(key);
    },
  },
  sessionStorage: {
    getItem(key: string) {
      return sessionStore.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      sessionStore.set(key, value);
    },
    removeItem(key: string) {
      sessionStore.delete(key);
    },
  },
  setTimeout,
  clearTimeout,
  dispatchEvent() {
    return true;
  },
} as unknown as Window & typeof globalThis;

Object.defineProperty(import.meta, "env", {
  value: {
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_ANON_KEY: "anon-key",
  },
  configurable: true,
});

const { DEFAULT_CONFIG } = await import("../src/config/site-config.ts");
const { loadConfig, saveConfig } =
  await import("../src/services/dataAdapter.ts");

test("loadConfig keeps local storage mode when the user has selected local save", () => {
  const saved = {
    ...DEFAULT_CONFIG,
    admin: {
      ...DEFAULT_CONFIG.admin,
      storageMode: "local",
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
    },
  };
  localStore.clear();
  localStore.set("funnel_site_config_v1", JSON.stringify(saved));

  const config = loadConfig();
  assert.equal(config.admin.storageMode, "local");
});

test("saveConfig stores a local copy even if Supabase sync fails", async () => {
  localStore.clear();
  globalThis.fetch = async () => {
    throw new Error("network");
  };

  const config = {
    ...DEFAULT_CONFIG,
    admin: {
      ...DEFAULT_CONFIG.admin,
      storageMode: "database",
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
    },
  };

  const result = await saveConfig(config);
  assert.equal(result, false);
  assert.ok(localStore.has("funnel_site_config_v1"));
});

test("saveLead falls back to local storage when remote database insert fails", async () => {
  localStore.clear();
  globalThis.fetch = async () => {
    throw new Error("network");
  };

  const config = {
    ...DEFAULT_CONFIG,
    admin: {
      ...DEFAULT_CONFIG.admin,
      storageMode: "database",
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
    },
  };

  const { saveLead } = await import("../src/services/dataAdapter.ts");
  const saved = await saveLead(
    {
      id: "lead_fallback",
      at: new Date().toISOString(),
      name: "Nguyễn Văn A",
      phone: "0900000001",
      email: "a@example.com",
      city: "Hà Nội",
      major: "Công nghệ",
      storage: "database",
    },
    config,
  );

  assert.equal(saved.storage, "local");
  const leads = JSON.parse(localStore.get("funnel_leads_v1") || "[]");
  assert.equal(leads.length, 1);
  assert.equal(leads[0].phone, "0900000001");
});

test("syncLeadsToSupabase reports local saved and cloud synced statuses", async () => {
  localStore.clear();

  const lead = {
    id: "lead_1",
    at: new Date().toISOString(),
    name: "Nguyễn Văn A",
    phone: "0900000001",
    city: "Hà Nội",
    major: "Công nghệ",
    aiScore: 82,
    aiRank: "HOT",
    storage: "local",
  } as const;

  localStore.set("funnel_leads_v1", JSON.stringify([lead]));

  globalThis.fetch = async () => ({ ok: true }) as Response;

  const { syncLeadsToSupabase } =
    await import("../src/services/dataAdapter.ts");
  const result = await syncLeadsToSupabase({
    ...DEFAULT_CONFIG,
    admin: {
      ...DEFAULT_CONFIG.admin,
      storageMode: "database",
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
    },
  });

  assert.equal(result.total, 1);
  assert.equal(result.synced, 1);
  assert.equal(result.failed, 0);
  assert.equal(result.skipped, 0);
});

test("session phone tracking remembers the mobile number and whether the form was submitted", async () => {
  const {
    setSessionPhoneHint,
    markSessionFormSubmitted,
    getSessionPhoneState,
  } = await import("../src/lib/visitor-tracking.ts");

  sessionStore.clear();
  setSessionPhoneHint("0912345678");
  assert.equal(getSessionPhoneState().phoneHint, "0912345678");
  assert.equal(getSessionPhoneState().formSubmitted, false);

  markSessionFormSubmitted("0912345678");
  const state = getSessionPhoneState();
  assert.equal(state.phoneHint, "0912345678");
  assert.equal(state.submittedPhone, "0912345678");
  assert.equal(state.formSubmitted, true);
});

test("buildVisitorBehaviorPayload can read session phone state without crashing", async () => {
  const { setSessionPhoneHint } =
    await import("../src/lib/visitor-tracking.ts");
  const { buildVisitorBehaviorPayload } =
    await import("../src/lib/behavior.ts");

  sessionStore.clear();
  setSessionPhoneHint("0912345678");

  const payload = buildVisitorBehaviorPayload({
    city: "Hà Nội",
    major: "Công nghệ Ô tô điện",
  });

  assert.equal(payload.visitorBehaviorPayload.sessionPhoneHint, "0912345678");
  assert.equal(payload.behavior.session_phone_hint, "0912345678");
});

test("decrementCountdownWithServiceRole creates a countdown row when config is missing", async () => {
  const calls: Array<{ method: string; url: string; body?: string }> = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({
      method,
      url,
      body: init?.body ? String(init.body) : undefined,
    });

    if (url.includes("/rest/v1/funnel_configs?id=eq.1&select=data")) {
      return {
        ok: true,
        json: async () => [],
      } as Response;
    }

    if (url.includes("/rest/v1/funnel_configs?id=eq.1")) {
      return { ok: true } as Response;
    }

    return {
      ok: true,
      json: async () => ({ access_token: "token" }),
    } as Response;
  };

  const { decrementCountdownWithServiceRole } =
    await import("../src/services/config.functions.ts");

  const result = await decrementCountdownWithServiceRole({
    data: { url: "https://example.supabase.co" },
  });

  assert.deepEqual(result, { ok: true, changed: true });
  assert.ok(
    calls.some(
      (call) =>
        call.method === "PATCH" &&
        call.url.includes("/rest/v1/funnel_configs?id=eq.1") &&
        String(call.body ?? "").includes('"slotsLeft":11'),
    ),
  );
});

test("saved lead should still be treated as success when downstream webhooks fail", async () => {
  const { shouldTreatSubmitAsFailure } =
    await import("../src/components/LeadForm.tsx");

  assert.equal(
    shouldTreatSubmitAsFailure({ leadSaved: true, webhookDeliveryOk: false }),
    false,
  );
  assert.equal(
    shouldTreatSubmitAsFailure({ leadSaved: false, webhookDeliveryOk: false }),
    true,
  );
});

test("buildDailyAnalyticsSummary groups counts by day and keeps daily resets separate from lifetime totals", async () => {
  const { buildDailyAnalyticsSummary } =
    await import("../src/services/dataAdapter.ts");

  const analytics = {
    visits: 42,
    leads: 8,
    bySource: { google: 12, direct: 30 },
    bySourceStats: {
      google: { visits: 12, leads: 3 },
      direct: { visits: 30, leads: 5 },
    },
    byVariant: { A: { visits: 20, leads: 3 }, B: { visits: 22, leads: 5 } },
    daily: {
      "2025-01-10": {
        date: "2025-01-10",
        visits: 18,
        leads: 4,
        bySource: { google: 8, direct: 10 },
        bySourceStats: {
          google: { visits: 8, leads: 2 },
          direct: { visits: 10, leads: 2 },
        },
        byVariant: { A: { visits: 12, leads: 2 }, B: { visits: 6, leads: 2 } },
      },
      "2025-01-11": {
        date: "2025-01-11",
        visits: 24,
        leads: 4,
        bySource: { direct: 24 },
        bySourceStats: { direct: { visits: 24, leads: 4 } },
        byVariant: { B: { visits: 24, leads: 4 } },
      },
    },
  } as const;

  const result = buildDailyAnalyticsSummary(analytics, {
    start: "2025-01-10",
    end: "2025-01-11",
  });

  assert.equal(result.totalVisits, 42);
  assert.equal(result.totalLeads, 8);
  assert.equal(result.conversionRate, "19.0%");
  assert.deepEqual(
    result.dailyBreakdown.map((item) => item.date),
    ["2025-01-10", "2025-01-11"],
  );
  assert.equal(result.dailyBreakdown[0].leads, 4);
  assert.equal(result.dailyBreakdown[1].visits, 24);
});

test("renderAnalyticsReportTemplate replaces placeholders in subject and body", async () => {
  const { renderAnalyticsReportTemplate } =
    await import("../src/services/dataAdapter.ts");

  const rendered = renderAnalyticsReportTemplate(
    "[Report] {date} | {totalVisits} visits | {totalLeads} leads",
    {
      date: "2025-01-11",
      totalVisits: 24,
      totalLeads: 4,
      conversionRate: "16.7%",
      note: "Daily summary",
    },
  );

  assert.equal(rendered, "[Report] 2025-01-11 | 24 visits | 4 leads");
});

test("selectSalesRecipient follows weighted and round robin formulas", async () => {
  const { selectSalesRecipient } = await import("../src/services/webhooks.ts");
  const recipients = ["sale1@test.com", "sale2@test.com", "sale3@test.com"];

  const randomChoice = selectSalesRecipient({
    recipients,
    mode: "random",
    weights: {},
    leadKey: "lead-1",
  });
  assert.ok(recipients.includes(randomChoice));

  const weightedChoice = selectSalesRecipient({
    recipients,
    mode: "weighted_percent",
    weights: {
      "sale1@test.com": 60,
      "sale2@test.com": 30,
      "sale3@test.com": 10,
    },
    leadKey: "weighted-lead",
  });
  assert.equal(weightedChoice, "sale1@test.com");

  const roundRobinChoice = selectSalesRecipient({
    recipients,
    mode: "daily_round_robin",
    weights: {},
    leadKey: "lead-date-1",
    date: "2026-09-20",
  });
  assert.equal(roundRobinChoice, "sale1@test.com");
});

test("analytics report endpoint accepts custom recipients and summary payload", async () => {
  const calls: Array<{ url: string; body?: string }> = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? String(init.body) : undefined });
    return {
      ok: true,
      json: async () => ({ sent: true, recipients: 2 }),
      text: async () => "ok",
    } as Response;
  };

  const { default: server } = await import("../src/server.ts");
  process.env.BACKUP_FROM_EMAIL = "no-reply@example.com";
  process.env.RESEND_API_KEY = "test-key";
  process.env.REPORT_RECIPIENT_EMAIL = "ops@example.com";

  const response = await server.fetch(
    new Request("https://example.com/api/analytics-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients: ["a@example.com", "b@example.com"],
        subject: "Weekly report",
        note: "Custom note",
        summary: {
          totalVisits: 120,
          totalLeads: 15,
          conversionRate: "12.5%",
          sourceBreakdown: [
            {
              source: "google",
              visits: 60,
              leads: 10,
              conversionRate: "16.7%",
            },
          ],
        },
      }),
    }),
    {},
    {},
  );

  assert.equal(response.status, 200);
  const body = JSON.parse(await response.text());
  assert.equal(body.sent, true);
  assert.ok(calls[0]?.body?.includes('"to":["a@example.com","b@example.com"]'));
  assert.ok(calls[0]?.body?.includes('"subject":"Weekly report"'));
});

test("sheets webhook payload is encoded as form payload for Apps Script", async () => {
  const { buildSheetsRequest } = await import("../src/services/webhooks.ts");
  const request = buildSheetsRequest({
    full_name: "Nguyễn Văn A",
    phone: "0900000001",
    event: "lead_created",
  });

  assert.match(request.body, /payload=/);
  assert.match(request.body, /Nguyễn Văn A/);
  assert.equal(
    request.contentType,
    "application/x-www-form-urlencoded;charset=UTF-8",
  );
});
