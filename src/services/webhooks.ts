/**
 * MULTI-CHANNEL WEBHOOK & API SYNC HUB
 * Gửi song song một lead tới mọi endpoint đang bật: Make/Zapier, Google Sheets,
 * Telegram Bot, Supabase REST hoặc endpoint tuỳ ý.
 */
import type { SiteConfig, WebhookEndpoint } from "@/config/site-config";
import { relayWebhook } from "@/services/webhook.functions";

export interface WebhookResult {
  label: string;
  ok: boolean;
  detail?: string;
  attempts: number;
}

export interface SelectSalesRecipientInput {
  recipients: string[];
  mode: "random" | "daily_round_robin" | "weighted_percent";
  weights?: Record<string, number>;
  leadKey?: string;
  date?: string;
}

export function selectSalesRecipient({
  recipients,
  mode,
  weights = {},
  leadKey = "",
  date,
}: SelectSalesRecipientInput): string {
  const available = recipients.filter(Boolean);
  if (available.length === 0) return "";

  if (mode === "weighted_percent") {
    const entries = available.map(
      (email) =>
        [email, Number(weights[email] ?? 100 / available.length)] as const,
    );
    const total = entries.reduce(
      (sum, [, weight]) => sum + (Number(weight) || 0),
      0,
    );
    if (total <= 0) return available[0] || "";
    const pivot =
      (Math.abs(hashString(leadKey || date || available.join("|"))) % total) +
      1;
    let cursor = 0;
    for (const [email, weight] of entries) {
      cursor += Number(weight) || 0;
      if (pivot <= cursor) return email;
    }
    const lastEmail = entries.at(-1)?.[0];
    return lastEmail ?? available[0] ?? "";
  }

  if (mode === "random") {
    return available[Math.floor(Math.random() * available.length)] || "";
  }

  const dayKey = date || new Date().toISOString().slice(0, 10);
  const seed = hashString(`${dayKey}|${leadKey || available.join("|")}`);
  return available[Math.abs(seed) % available.length] || available[0] || "";
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function buildSheetsRequest(payload: Record<string, unknown>) {
  return {
    body: `payload=${JSON.stringify(payload)}`,
    contentType: "application/x-www-form-urlencoded;charset=UTF-8",
  };
}

const TIMEOUT_MS = 4_000;
// Apps Script khởi động chậm hơn webhook thường, 4s hay bị timeout giả.
const SHEETS_TIMEOUT_MS = 12_000;

async function sendSheetsDirect(
  endpoint: string,
  body: string,
): Promise<WebhookResult> {
  try {
    // Apps Script accepts this simple request without a CORS preflight. The
    // response is opaque, so this path means the request was handed to Google.
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      mode: "no-cors",
      keepalive: true,
    });
    return {
      label: "Google Sheets",
      ok: true,
      attempts: 1,
      detail: "direct_browser_post",
    };
  } catch (error) {
    return {
      label: "Google Sheets",
      ok: false,
      attempts: 1,
      detail:
        error instanceof Error ? error.message : "Direct Sheets request failed",
    };
  }
}

/**
 * Apps Script luôn trả HTTP 200 kể cả khi bản deploy không có doPost.
 * Vì vậy phải đọc nội dung trả về mới biết Sheet có nhận dữ liệu hay không.
 */
export function appsScriptError(body: string): string | undefined {
  const text = (body || "").trim();
  if (!text) return undefined;
  if (/Script function not found/i.test(text)) {
    return "Bản deploy Apps Script chưa có mã webhook (thiếu doPost). Hãy dán lại script và Deploy phiên bản mới.";
  }
  if (/<html|<!DOCTYPE/i.test(text)) {
    if (
      /unable to open|Page Not Found|Authorization|Đăng nhập|Sign in/i.test(
        text,
      )
    ) {
      return "Google trả về trang lỗi/đăng nhập. Hãy deploy Web App với quyền truy cập 'Anyone'.";
    }
    return "Apps Script trả về trang HTML thay vì JSON. Hãy kiểm tra lại bản deploy.";
  }
  try {
    const parsed = JSON.parse(text) as { ok?: boolean; error?: string };
    if (parsed && parsed.ok === false) {
      return parsed.error || "Apps Script báo lỗi khi ghi vào Sheet";
    }
  } catch {
    return "Phản hồi từ Apps Script không hợp lệ";
  }
  return undefined;
}
const MAX_PAYLOAD_BYTES = 60_000;

export const WEBHOOK_FIELD_OPTIONS = [
  ["event", "Loại sự kiện"],
  ["webhook_delivery_id", "Mã giao webhook"],
  ["idempotency_key", "Mã chống trùng"],
  ["created_at", "Thời điểm submit"],
  ["full_name", "Họ tên"],
  ["phone", "Số điện thoại"],
  ["email", "Email"],
  ["city", "Tỉnh/thành"],
  ["major", "Ngành quan tâm"],
  ["source", "Nguồn chính"],
  ["sale_align", "Sale được gán (kết quả chia)"],
  ["sale_assigned_to", "Email sale được gán"],
  ["sales_distribution_mode", "Chế độ chia sale"],
  ["sales_email_recipients", "Danh sách sale tham gia chia"],
  ["landing_url", "URL landing"],
  ["ab_variant", "Biến thể A/B"],
  ["ai_score", "AI score"],
  ["ai_rank", "AI rank"],
  ["risk_level", "Mức rủi ro"],
  ["risk_reasons", "Lý do rủi ro"],
  ["recommended_action", "Hành động đề xuất"],
  ["sale_advice", "Lời khuyên sale"],
  ["behavior_summary", "Tóm tắt hành vi"],
  ["device_tech_info", "Thông tin thiết bị"],
  ["traffic_ads_source", "Nguồn quảng cáo"],
  ["visits_today", "Lượt hôm nay"],
  ["visits_month", "Lượt tháng"],
  ["current_session", "Phiên hiện tại"],
  ["device_manufacturer", "Hãng thiết bị"],
  ["device_family", "Dòng thiết bị"],
  ["device_model_name", "Model thiết bị"],
  ["operating_system", "Hệ điều hành"],
  ["browser", "Trình duyệt"],
  ["network_provider", "Nhà mạng"],
  ["network_label", "Loại mạng"],
  ["utm_source", "UTM source"],
  ["utm_medium", "UTM medium"],
  ["utm_campaign", "UTM campaign"],
  ["utm_content", "UTM content"],
  ["utm_term", "UTM term"],
  ["ttclid", "TikTok click ID"],
  ["fbclid", "Facebook click ID"],
  ["gclid", "Google click ID"],
  ["referrer", "Referrer"],
  ["attribution_model", "Attribution model"],
  ["attribution_detected_by", "Cách nhận diện attribution"],
  ["raw_query", "Query URL gốc"],
  ["utm_params", "UTM bổ sung"],
] as const;

export const DEFAULT_SHEETS_FIELDS = WEBHOOK_FIELD_OPTIONS.map(([key]) => key);

function validUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

function compactPayload(payload: Record<string, unknown>) {
  const serialized = JSON.stringify(payload);
  if (new TextEncoder().encode(serialized).byteLength <= MAX_PAYLOAD_BYTES) {
    return payload;
  }
  const compact = { ...payload };
  delete compact["visitor_behavior_payload"];
  return compact;
}

export function webhookConfigurationWarning(
  endpoint: WebhookEndpoint,
  config: SiteConfig,
): string | undefined {
  const value = endpoint.url.trim();
  if (!value) return "Chưa nhập URL endpoint";
  if (!validUrl(value))
    return "URL phải dùng HTTPS (localhost có thể dùng HTTP)";
  if (endpoint.type === "telegram" && !value.includes("/bot")) {
    return "URL Telegram cần có dạng /bot<TOKEN>/sendMessage?chat_id=...";
  }
  if (
    endpoint.type === "telegram" &&
    !new URL(value).searchParams.get("chat_id")
  ) {
    return "URL Telegram đang thiếu chat_id";
  }
  if (
    endpoint.type === "supabase" &&
    (!config.admin.supabaseUrl || !config.admin.supabaseAnonKey)
  ) {
    return "Cần cấu hình Supabase URL và anon key trong Storage trước";
  }
  return undefined;
}

function telegramBody(url: string, payload: Record<string, unknown>) {
  // URL dạng: https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=123
  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const text = Object.entries(payload)
    .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v ?? ""))}`)
    .join("\n");
  const u = new URL(url);
  const chatId = u.searchParams.get("chat_id") || "";
  u.searchParams.delete("chat_id");
  return {
    endpoint: u.toString(),
    body: { chat_id: chatId, text, parse_mode: "HTML" },
  };
}

async function postOne(
  ep: WebhookEndpoint,
  payload: Record<string, unknown>,
  supabase: { url: string; key: string },
): Promise<WebhookResult> {
  try {
    let endpoint = ep.url;
    let body: unknown = payload;
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const idempotencyKey = payload["idempotency_key"];
    if (typeof idempotencyKey === "string" && idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey;
    }

    if (ep.type === "sheets") {
      const hasFields = Boolean(ep.fields?.length);
      const hasColumnMap = Boolean(
        ep.columnMap && Object.keys(ep.columnMap).length,
      );
      const filtered = hasFields
        ? Object.fromEntries(
            Object.entries(payload).filter(([key]) => ep.fields?.includes(key)),
          )
        : payload;
      body = {
        ...filtered,
        ...(hasFields ? { sheet_fields: ep.fields } : {}),
        ...(hasColumnMap ? { sheet_columns: ep.columnMap } : {}),
      };
    } else if (ep.type === "telegram") {
      const t = telegramBody(ep.url, payload);
      endpoint = t.endpoint;
      body = t.body;
    } else if (ep.type === "supabase" && supabase.url && supabase.key) {
      endpoint = `${supabase.url.replace(/\/$/, "")}/rest/v1/${ep.url.replace(/^\//, "") || "leads"}`;
      headers = {
        ...headers,
        apikey: supabase.key,
        Authorization: `Bearer ${supabase.key}`,
        Prefer: "return=minimal",
      };
      body = [payload];
    }
    if (!validUrl(endpoint))
      return {
        label: ep.label || ep.type,
        ok: false,
        attempts: 0,
        detail: "URL không hợp lệ hoặc không dùng HTTPS",
      };

    if (ep.type === "sheets") {
      try {
        const request = buildSheetsRequest(
          typeof body === "object" && body !== null
            ? (body as Record<string, unknown>)
            : { payload: body },
        );
        const relay = await Promise.race([
          relayWebhook({
            data: {
              endpoint,
              body: request.body,
              headers: { "Content-Type": request.contentType },
            },
          }),
          new Promise<null>((resolve) =>
            window.setTimeout(() => resolve(null), SHEETS_TIMEOUT_MS),
          ),
        ]);
        if (relay) {
          const sheetsError = relay.ok
            ? appsScriptError(relay.body ?? "")
            : relay.detail || `HTTP ${relay.status}`;
          if (!relay.ok) {
            const fallback = await sendSheetsDirect(endpoint, request.body);
            if (fallback.ok) {
              return { ...fallback, label: ep.label || ep.type, attempts: 2 };
            }
          }
          return {
            label: ep.label || ep.type,
            ok: relay.ok && !sheetsError,
            attempts: 1,
            detail: sheetsError ?? "server_relay_sheets",
          };
        }
        return sendSheetsDirect(
          endpoint,
          buildSheetsRequest(
            typeof body === "object" && body !== null
              ? (body as Record<string, unknown>)
              : { payload: body },
          ).body,
        );
      } catch (error) {
        const fallback = await sendSheetsDirect(
          endpoint,
          buildSheetsRequest(
            typeof body === "object" && body !== null
              ? (body as Record<string, unknown>)
              : { payload: body },
          ).body,
        );
        return fallback.ok
          ? { ...fallback, label: ep.label || ep.type }
          : {
              label: ep.label || ep.type,
              ok: false,
              attempts: 2,
              detail:
                error instanceof Error
                  ? `${error.message}; ${fallback.detail || "direct fallback failed"}`
                  : fallback.detail || "Direct Sheets request failed",
            };
      }
    }

    // Always use the server relay. A client fallback after a relay timeout can
    // duplicate a request that already reached the endpoint.
    try {
      const relay = await Promise.race([
        relayWebhook({ data: { endpoint, body, headers } }),
        new Promise<null>((resolve) =>
          window.setTimeout(() => resolve(null), TIMEOUT_MS),
        ),
      ]);
      if (relay) {
        return {
          label: ep.label || ep.type,
          ok: relay.ok,
          attempts: 1,
          detail: relay.ok
            ? "server_relay"
            : relay.detail || `HTTP ${relay.status}`,
        };
      }
      return {
        label: ep.label || ep.type,
        ok: false,
        attempts: 1,
        detail: "Server relay timeout",
      };
    } catch {
      return {
        label: ep.label || ep.type,
        ok: false,
        attempts: 1,
        detail: "Server relay unavailable",
      };
    }
  } catch (err) {
    return {
      label: ep.label || ep.type,
      ok: false,
      attempts: 0,
      detail: (err as Error).message,
    };
  }
}

export async function testWebhookEndpoint(
  endpoint: WebhookEndpoint,
  config: SiteConfig,
): Promise<WebhookResult> {
  const supabase = {
    url: config.admin.supabaseUrl,
    key: config.admin.supabaseAnonKey,
  };
  // Bảng Supabase tùy ý (VD "leads") không khớp field với payload test chung
  // ("test", "event", "sent_at"), gây lỗi PGRST204 giả dù cấu hình đúng.
  // Thay vào đó chỉ kiểm tra kết nối/quyền đọc bảng, không insert dữ liệu giả.
  if (endpoint.type === "supabase" && supabase.url && supabase.key) {
    const table = endpoint.url.replace(/^\//, "").trim() || "leads";
    try {
      const response = await fetch(
        `${supabase.url.replace(/\/$/, "")}/rest/v1/${table}?select=id&limit=0`,
        {
          headers: {
            apikey: supabase.key,
            Authorization: `Bearer ${supabase.key}`,
          },
        },
      );
      if (response.ok)
        return {
          label: endpoint.label || endpoint.type,
          ok: true,
          attempts: 1,
        };
      const detail = await response.text().catch(() => "");
      return {
        label: endpoint.label || endpoint.type,
        ok: false,
        attempts: 1,
        detail: detail.trim().slice(0, 180) || `HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        label: endpoint.label || endpoint.type,
        ok: false,
        attempts: 1,
        detail: (err as Error).message,
      };
    }
  }
  return postOne(
    endpoint,
    { test: true, event: "webhook_test", sent_at: new Date().toISOString() },
    supabase,
  );
}

/**
 * Gửi lead đi mọi kênh. Khi đã cấu hình nhiều kênh, chỉ coi là thành công
 * khi tất cả kênh đều nhận được dữ liệu; không cấu hình kênh nào vẫn hợp lệ.
 */
export async function dispatchLead(
  config: SiteConfig,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; results: WebhookResult[]; failedCount?: number }> {
  payload = compactPayload(payload);
  const endpoints: WebhookEndpoint[] = [];

  const primary = config.form.webhookUrl?.trim();
  if (primary && primary.startsWith("http") && !primary.includes("REPLACE")) {
    endpoints.push({
      id: "primary",
      label: "Webhook chính",
      url: primary,
      enabled: true,
      type: "make",
    });
  }
  endpoints.push(...config.webhooks.filter((w) => w.enabled && w.url.trim()));

  const uniqueEndpoints = endpoints.filter(
    (endpoint, index, all) =>
      all.findIndex(
        (candidate) => candidate.url.trim() === endpoint.url.trim(),
      ) === index,
  );

  if (uniqueEndpoints.length === 0) {
    return {
      ok: false,
      results: [
        {
          label: "Webhook chính",
          ok: false,
          attempts: 0,
          detail: "Chưa cấu hình URL webhook trong Form & Webhook",
        },
      ],
      failedCount: 1,
    };
  }

  const supabase = {
    url: config.admin.supabaseUrl,
    key: config.admin.supabaseAnonKey,
  };

  const results = await Promise.all(
    uniqueEndpoints.map((ep) => postOne(ep, payload, supabase)),
  );

  const failed = results.filter((r) => !r.ok);

  return {
    // Partial delivery is useful for diagnostics, but must not be reported as
    // a complete multi-channel delivery.
    ok: failed.length === 0,
    results,
    failedCount: failed.length,
  };
}
