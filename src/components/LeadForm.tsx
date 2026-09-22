import { useRef, useState } from "react";
import { toast } from "sonner";
import { trackFormStart, trackLead } from "@/lib/tracking";
import {
  buildVisitorBehaviorPayload,
  joinParts,
  markCopyPaste,
  markFormStart,
  markIndustrySwitch,
  syncBehaviorSession,
} from "@/lib/behavior";
import {
  markSessionFormSubmitted,
  setSessionPhoneHint,
} from "@/lib/visitor-tracking";
import { getVariant, utmSource } from "@/lib/ab";
import { getUtmPayload } from "@/lib/utm-hub";
import { UtmHiddenFields } from "@/components/UtmHiddenFields";
import { useSiteConfig } from "@/lib/use-site-config";
import { dispatchLead, selectSalesRecipient } from "@/services/webhooks";
import {
  isDuplicateLead,
  isDuplicateLeadRemote,
  saveLead,
  trackConversion,
  type LeadRecord,
} from "@/services/dataAdapter";
import { sendLeadEmail } from "@/lib/email.functions";

export const MAJORS = [
  "Công nghệ Ô tô điện",
  "Công nghệ Drone (UAV)",
  "Thương mại điện tử",
  "Logistics & Chuỗi cung ứng",
  "Kỹ thuật Điện tử",
  "IoT - Internet vạn vật",
  "Cơ khí tự động hóa",
  "Hán ngữ thương mại",
];

/** 63 tỉnh/thành Việt Nam gom theo vùng (dùng cho <optgroup>) */
const PROVINCE_GROUPS: { region: string; provinces: string[] }[] = [
  {
    region: "Miền Bắc",
    provinces: [
      "Hà Nội",
      "Hà Giang",
      "Cao Bằng",
      "Bắc Kạn",
      "Tuyên Quang",
      "Lào Cai",
      "Điện Biên",
      "Lai Châu",
      "Sơn La",
      "Yên Bái",
      "Hòa Bình",
      "Thái Nguyên",
      "Lạng Sơn",
      "Quảng Ninh",
      "Bắc Giang",
      "Phú Thọ",
      "Vĩnh Phúc",
      "Bắc Ninh",
      "Hải Dương",
      "Hải Phòng",
      "Hưng Yên",
      "Thái Bình",
      "Hà Nam",
      "Nam Định",
      "Ninh Bình",
    ],
  },
  {
    region: "Miền Trung & Tây Nguyên",
    provinces: [
      "Thanh Hóa",
      "Nghệ An",
      "Hà Tĩnh",
      "Quảng Bình",
      "Quảng Trị",
      "Thừa Thiên Huế",
      "Đà Nẵng",
      "Quảng Nam",
      "Quảng Ngãi",
      "Bình Định",
      "Phú Yên",
      "Khánh Hòa",
      "Ninh Thuận",
      "Bình Thuận",
      "Kon Tum",
      "Gia Lai",
      "Đắk Lắk",
      "Đắk Nông",
      "Lâm Đồng",
    ],
  },
  {
    region: "Miền Nam",
    provinces: [
      "Bình Phước",
      "Tây Ninh",
      "Bình Dương",
      "Đồng Nai",
      "Bà Rịa - Vũng Tàu",
      "TP. Hồ Chí Minh",
      "Long An",
      "Tiền Giang",
      "Bến Tre",
      "Trà Vinh",
      "Vĩnh Long",
      "Đồng Tháp",
      "An Giang",
      "Kiên Giang",
      "Cần Thơ",
      "Hậu Giang",
      "Sóc Trăng",
      "Bạc Liêu",
      "Cà Mau",
    ],
  },
];

const EMPTY = { name: "", phone: "", email: "", province: "", major: "" };

type Status = "idle" | "sending" | "done" | "error";

const inputClass =
  "w-full rounded-xl border border-input bg-background px-4 py-3.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

/** Rate limiting: giới hạn số lần gửi trong 1 cửa sổ thời gian / trình duyệt (cấu hình trong Admin). */
let rateStamps: number[] = [];

function rateLimited(maxCount: number, windowMin: number): boolean {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  const windowMs = Math.max(1, windowMin) * 60 * 1000;
  let stamps = rateStamps;
  stamps = stamps.filter((t) => now - t < windowMs);
  if (stamps.length >= Math.max(1, maxCount)) return true;
  stamps.push(now);
  rateStamps = stamps;
  return false;
}

export function shouldTreatSubmitAsFailure({
  leadSaved,
  webhookDeliveryOk,
}: {
  leadSaved: boolean;
  webhookDeliveryOk: boolean;
}): boolean {
  return !leadSaved && !webhookDeliveryOk;
}

export function LeadForm({ id = "dang-ky" }: { id?: string }) {
  const { config, decrementCountdown } = useSiteConfig();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const startedRef = useRef(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const field = (name: string, fallback: string) =>
    config.form.fields.find((item) => item.name === name)?.placeholder ||
    fallback;

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const setMajor = (e: React.ChangeEvent<HTMLSelectElement>) => {
    markIndustrySwitch();
    setForm((f) => ({ ...f, major: e.target.value }));
  };

  const setPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/\D/g, "").slice(0, 10);
    setSessionPhoneHint(next);
    setForm((f) => ({
      ...f,
      phone: next,
    }));
  };

  // Khách bắt đầu tương tác với ô input đầu tiên -> form_start
  const onFirstInteract = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    markFormStart();
    trackFormStart(config.tracking.events.formStart);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending" || submittingRef.current) return;

    // Anti-spam honeypot: bot điền trường ẩn -> giả vờ thành công, không gửi
    if (honeypotRef.current?.value) {
      setForm(EMPTY);
      setStatus("done");
      return;
    }

    const phone = form.phone.replace(/\D/g, "");
    if (!/^(03|05|07|08|09)\d{8}$/.test(phone)) {
      setError(
        "Số điện thoại không hợp lệ. Phải bắt đầu bằng 03, 05, 07, 08 hoặc 09 và đủ 10 số — ví dụ: 0912345678.",
      );
      setStatus("error");
      return;
    }
    const name = form.name.trim();
    if (name.length < 2 || !/^[\p{L}\s]+$/u.test(name)) {
      setError(
        "Họ và tên chỉ chứa chữ cái và dấu tiếng Việt, tối thiểu 2 ký tự.",
      );
      setStatus("error");
      return;
    }
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError("Email chưa đúng định dạng — ví dụ: ten@gmail.com.");
      setStatus("error");
      return;
    }

    if (isDuplicateLead(phone)) {
      setError(
        "Số điện thoại này vừa được đăng ký. Tư vấn viên sẽ liên hệ với bạn sớm nhất.",
      );
      setStatus("error");
      return;
    }

    submittingRef.current = true;
    if (await isDuplicateLeadRemote(phone, config)) {
      submittingRef.current = false;
      setError(
        "Số điện thoại này vừa được đăng ký. Tư vấn viên sẽ liên hệ với bạn sớm nhất.",
      );
      setStatus("error");
      return;
    }

    if (
      rateLimited(config.form.rateLimitCount, config.form.rateLimitWindowMin)
    ) {
      submittingRef.current = false;
      setError(
        "Bạn đã gửi nhiều lần trong thời gian ngắn. Vui lòng chờ vài phút rồi thử lại.",
      );
      setStatus("error");
      return;
    }

    setError("");
    setSessionPhoneHint(phone);
    markSessionFormSubmitted(phone);
    setStatus("sending");

    let leadSaved = false;
    let leadDispatchStarted = false;
    let emailDeliveryFailed = false;
    let successFinalized = false;
    // Khi lead đã được ghi nhận, khách LUÔN phải thấy trạng thái thành công +
    // chuyển sang trang cảm ơn. Mọi lỗi phụ (webhook, tracking, redirect) không
    // được biến submit thành thất bại. Helper này chạy tối đa một lần.
    const finalizeSuccess = () => {
      if (successFinalized) return;
      successFinalized = true;
      setForm(EMPTY);
      submittingRef.current = false;
      setStatus("done");
      toast.success("Đăng ký thành công!", {
        description: "Tư vấn viên sẽ liên hệ lại trong 5 phút.",
      });
      // Redirect (Thank You Page) nếu Admin cấu hình.
      const redirect = config.form.redirectUrl?.trim();
      if (redirect && typeof window !== "undefined") {
        window.location.assign(redirect);
        return;
      }
      const thankYou = config.pages.find(
        (page) => page.enabled && page.kind === "thankYou",
      );
      if (thankYou && typeof window !== "undefined")
        window.location.assign(`/${thankYou.path}`);
    };
    try {
      const variant = getVariant(config.abTest.enabled, config.abTest.split);
      syncBehaviorSession({
        storageMode: config.admin.storageMode,
        supabaseUrl: config.admin.supabaseUrl,
        supabaseAnonKey: config.admin.supabaseAnonKey,
        variant,
      });
      const sessionSource = utmSource();
      // Hub UTM: dữ liệu attribution sạch, luôn an toàn (không throw)
      const utmData = getUtmPayload("last");
      const trackedSource = utmData["utm_source"] || sessionSource || "direct";
      const { behavior, assessment, visitorBehaviorPayload } =
        buildVisitorBehaviorPayload(
          {
            city: form.province,
            major: form.major,
          },
          config.aiAdvisor,
          sessionSource,
          config.salesAdvice,
        );
      const { score: aiScore, rank: aiRank } = assessment;
      const source = trackedSource;

      const webhookDeliveryId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `delivery_${Date.now()}_${phone}`;
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `lead_${Date.now()}_${phone}`;

      // Gán sale TRƯỚC khi gửi webhook, để kết quả phân bổ (sale_align) nằm
      // ngay trong payload của LẦN GỬI DUY NHẤT khi submit.
      const parseSalesList = (value: string) =>
        value
          .split(/[;,\n]/)
          .map((item) => item.trim())
          .filter(Boolean);
      const configuredSalesList = Array.isArray(
        config.emailAutomation.salesEmailList,
      )
        ? config.emailAutomation.salesEmailList
        : parseSalesList(String(config.emailAutomation.salesEmailList || ""));
      const salesRecipients =
        configuredSalesList.length > 0
          ? configuredSalesList.map((item) => item.trim()).filter(Boolean)
          : parseSalesList(config.emailAutomation.notifyEmail);
      const salesWeights = Object.fromEntries(
        Object.entries(
          config.emailAutomation.salesDistributionWeights || {},
        ).filter(([key, val]) => Boolean(key) && Number(val) > 0),
      );
      const selectedSaleRecipient = selectSalesRecipient({
        recipients: salesRecipients,
        mode: config.emailAutomation.salesDistributionMode,
        weights: salesWeights,
        leadKey: idempotencyKey || phone,
        date: new Date().toISOString().slice(0, 10),
      });

      const payload = {
        event: "lead_created",
        webhook_delivery_id: webhookDeliveryId,
        idempotency_key: idempotencyKey,
        sale_align: selectedSaleRecipient,
        sale_assigned_to: selectedSaleRecipient,
        sales_distribution_mode: config.emailAutomation.salesDistributionMode,
        sales_email_recipients: salesRecipients.join(", "),
        full_name: name.slice(0, 100),
        phone,
        email: email.slice(0, 255),
        major: form.major,
        city: form.province,
        landing_url:
          typeof window !== "undefined"
            ? window.location.href
            : "Landing Page UTM",
        source,
        created_at: visitorBehaviorPayload.submittedAt,
        ab_variant: variant,
        ai_score: aiScore,
        ai_rank: aiRank,
        risk_level: assessment.riskLevel,
        risk_reasons: assessment.reasons,
        recommended_action: assessment.recommendedAction,
        utm_source: source,
        utm_medium: utmData["utm_medium"] || behavior.utm_medium,
        utm_campaign: utmData["utm_campaign"] || behavior.utm_campaign,
        utm_content: utmData["utm_content"] || behavior.utm_content,
        utm_term: behavior.utm_term || utmData["utm_term"] || "",
        ttclid: behavior.ttclid || utmData["ttclid"] || "",
        fbclid: utmData["fbclid"] || "",
        gclid: utmData["gclid"] || "",
        referrer: utmData["referrer"] || "",
        attribution_model: utmData["attribution_model"] || "last",
        attribution_detected_by: utmData["attribution_detected_by"] || "",
        raw_query: utmData["raw_query"] || "",
        utm_params: utmData,
        visits_today: behavior.visits_today,
        visits_month: behavior.visits_month,
        current_session: behavior.current_session,
        device_manufacturer: behavior.device_manufacturer,
        device_family: behavior.device_family,
        device_model_name: behavior.device_model_name,
        operating_system: joinParts([
          behavior.operating_system,
          behavior.operating_system_version,
        ]),
        browser: joinParts([behavior.browser, behavior.browser_version]),
        network_provider: behavior.network_provider,
        network_label: behavior.network_label,
        sale_advice: visitorBehaviorPayload.saleAdvice,
        behavior_summary: visitorBehaviorPayload.behaviorSummary,
        device_tech_info: visitorBehaviorPayload.deviceTechInfo,
        traffic_ads_source: visitorBehaviorPayload.trafficAdsSource,
      };

      // Lưu Mini-CRM (localStorage / Supabase) để hiện trong bảng Quản Lý Lead.
      const leadRecord: LeadRecord = {
        id: `ld_${Date.now()}`,
        at: payload.created_at,
        name: payload.full_name,
        phone: payload.phone,
        email: payload.email || undefined,
        city: payload.city || undefined,
        major: payload.major || undefined,
        aiScore,
        aiRank,
        riskLevel: assessment.riskLevel,
        riskReasons: assessment.reasons,
        recommendedAction: assessment.recommendedAction,
        behaviorSummary: payload.behavior_summary,
        saleAdvice: payload.sale_advice,
        deviceTechInfo: payload.device_tech_info,
        trafficAdsSource: payload.traffic_ads_source,
        networkProvider: payload.network_provider || undefined,
        networkLabel: payload.network_label || undefined,
        visitsToday: payload.visits_today,
        visitsMonth: payload.visits_month,
        currentSession: payload.current_session,
        visitorBehaviorPayload,
        utmSource: source,
        utmMedium: payload.utm_medium,
        utmCampaign: payload.utm_campaign,
        utmContent: payload.utm_content,
        utmTerm: payload.utm_term,
        fbclid: payload.fbclid,
        ttclid: payload.ttclid,
        gclid: payload.gclid,
        rawQuery: utmData["raw_query"],
        referrer: payload.referrer,
        attributionModel: payload.attribution_model,
        attributionDetectedBy: payload.attribution_detected_by,
        utmParams: Object.fromEntries(
          Object.entries(utmData).filter(
            ([key]) =>
              ![
                "utm_source",
                "utm_medium",
                "utm_campaign",
                "utm_content",
                "utm_term",
                "raw_query",
                "landing_url",
                "referrer",
                "attribution_model",
                "attribution_detected_by",
              ].includes(key),
          ),
        ),
        variant,
        landing_url: payload.landing_url,
        deviceManufacturer: payload.device_manufacturer,
        deviceFamily: payload.device_family,
        deviceModel: payload.device_model_name,
        operatingSystem: payload.operating_system,
        browser: payload.browser,
      };
      // Lưu lead trước, sau đó xác nhận webhook chính trước khi báo thành công
      // để redirect không hủy request gửi dữ liệu.
      leadDispatchStarted = true;
      const savedLead = await saveLead(leadRecord, config);
      leadSaved = true;
      // dispatchLead tự bắt lỗi từng endpoint, nhưng vẫn có thể throw sớm
      // (vd payload không serialize được). Không để việc đó chặn submit đã lưu.
      let delivery: Awaited<ReturnType<typeof dispatchLead>>;
      try {
        delivery = await dispatchLead(config, payload);
      } catch (dispatchErr) {
        console.warn(
          "[v0] dispatchLead threw, treated as failed delivery:",
          dispatchErr,
        );
        delivery = {
          ok: false,
          failedCount: 1,
          results: [
            {
              label: "Webhook chính",
              ok: false,
              attempts: 0,
              detail:
                dispatchErr instanceof Error
                  ? dispatchErr.message
                  : "Không gửi được webhook",
            },
          ],
        };
      }
      let webhookDeliveryFailed = false;
      if (!delivery.ok) {
        webhookDeliveryFailed = true;
        const failed = delivery.results
          .filter((result) => !result.ok)
          .map(
            (result) => `${result.label}: ${result.detail || "không rõ lỗi"}`,
          )
          .join("; ");
        console.warn(
          `Lead saved, but webhook delivery was partial/failed: ${failed || "không có endpoint thành công"}`,
        );

        if (leadSaved) {
          toast.warning("Lead đã lưu, nhưng một webhook chưa nhận dữ liệu.", {
            description: failed || "Kiểm tra cấu hình Form & Webhook.",
          });
        } else {
          toast.error("Gửi chưa thành công", {
            description: failed || "Kiểm tra cấu hình Form & Webhook.",
          });
        }
      }
      if (
        config.admin.storageMode === "database" &&
        savedLead.storage !== "database"
      ) {
        console.warn(
          "Database mode fallback to local storage: Supabase cloud sync unavailable; lead was still saved locally.",
        );
      }
      const countdownSaved = await decrementCountdown(savedLead.id).catch(
        (countdownErr) => {
          console.warn("[v0] decrementCountdown failed:", countdownErr);
          return false;
        },
      );
      if (!countdownSaved) {
        toast.warning("Lead đã lưu, nhưng chưa cập nhật được số suất.", {
          description:
            "Kiểm tra SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trên server rồi redeploy.",
        });
      }

      // Ghi nhận chuyển đổi cho Analytics Dashboard + A/B comparison.
      // Lỗi tracking (vd localStorage đầy) không được chặn luồng submit.
      try {
        trackConversion(source, config.abTest.enabled ? variant : undefined);
      } catch (trackErr) {
        console.warn("[v0] trackConversion failed:", trackErr);
      }

      // Automated Email Sequencer (auto-responder) — chạy phía server nếu bật.
      // Toàn bộ khối này không được phép làm hỏng luồng submit chính: lỗi cấu
      // hình email (vd. thiếu/sai From) chỉ nên cảnh báo, không throw ra ngoài.
      try {
        if (config.emailAutomation.enabled) {
          type EmailTaskResult = {
            sent: boolean;
            reason?: string;
            detail?: string;
          };
          const safeSendLeadEmail = (
            args: Parameters<typeof sendLeadEmail>[0],
          ): Promise<EmailTaskResult> =>
            sendLeadEmail(args).catch((err) => ({
              sent: false,
              reason: "unexpected_error",
              detail: err instanceof Error ? err.message : String(err),
            }));
          const emailTasks: Promise<EmailTaskResult>[] = [];
          const escapeHtml = (value: string) =>
            value
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")
              .replaceAll('"', "&quot;")
              .replaceAll("'", "&#39;");
          const templateValues: Record<string, string> = {
            name: payload.full_name,
            phone: payload.phone,
            city: payload.city || "",
            major: form.major || "",
            source: source || "direct",
            ai_score: String(aiScore),
            timestamp: new Date().toLocaleString("vi-VN"),
            landing_url: payload.landing_url,
          };
          const fill = (s: string) =>
            s.replace(
              /\{(\w+)\}/g,
              (_, key: string) => templateValues[key] ?? "",
            );
          const resolveCtaUrl = (template: string) => {
            const filled = fill(template.trim());
            if (!filled) return payload.landing_url;
            try {
              return new URL(filled, payload.landing_url).toString();
            } catch {
              return payload.landing_url;
            }
          };
          const brandName =
            config.emailAutomation.brandName?.trim() ||
            config.emailAutomation.headerText?.trim() ||
            "Funnel Builder";
          const brandLogo = config.emailAutomation.brandLogoUrl?.trim();
          const htmlBody = (s: string, type: "customer" | "sales") => {
            const ctaLabel =
              (type === "customer"
                ? config.emailAutomation.customerCtaLabel
                : config.emailAutomation.salesCtaLabel
              )?.trim() ||
              config.emailAutomation.ctaLabel?.trim() ||
              (type === "customer" ? "Nhận tư vấn ngay" : "Mở lead trong CRM");
            const ctaUrl = resolveCtaUrl(
              type === "customer"
                ? config.emailAutomation.customerCtaUrl ||
                    config.emailAutomation.ctaUrl
                : config.emailAutomation.salesCtaUrl ||
                    config.emailAutomation.ctaUrl,
            );
            const bodyHtml = s
              .replaceAll("\n", "<br />")
              .replace(/\{(\w+)\}/g, (_, key: string) => {
                const value = escapeHtml(templateValues[key] || "—");
                return ["name", "phone"].includes(key)
                  ? `<strong>${value}</strong>`
                  : value;
              });
            const brandMarkup = brandLogo
              ? `<img src="${escapeHtml(brandLogo)}" alt="${escapeHtml(brandName)}" style="display:block;width:52px;height:52px;border-radius:14px;object-fit:cover;border:1px solid rgba(148,163,184,0.35);background:#fff;" />`
              : "";
            return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:28px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;color:#0f172a;line-height:1.7"><div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid #e2e8f0;margin-bottom:16px;">${brandMarkup}<div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;font-weight:700;">${escapeHtml(brandName)}</div></div>${bodyHtml}<div style="margin-top:18px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(ctaLabel)}</a></div></div>`;
          };
          const directNotify = config.emailAutomation.notifyEmail.trim();
          const saleRecipients =
            salesRecipients.length > 0
              ? salesRecipients
              : parseSalesList(directNotify);

          // Email cảm ơn gửi tới khách (nếu khách cung cấp email)
          if (email) {
            emailTasks.push(
              safeSendLeadEmail({
                data: {
                  provider: config.emailAutomation.provider,
                  to: email,
                  from: config.emailAutomation.fromEmail,
                  subject: fill(config.emailAutomation.subject),
                  text: `${fill(config.emailAutomation.body)}\n\n${fill(config.emailAutomation.customerCtaLabel || config.emailAutomation.ctaLabel || "Nhận tư vấn ngay")}: ${resolveCtaUrl(config.emailAutomation.customerCtaUrl || config.emailAutomation.ctaUrl)}`,
                  html: htmlBody(config.emailAutomation.body, "customer"),
                  resendApiKey: config.emailAutomation.resendApiKey,
                  gmailClientId: config.emailAutomation.gmailClientId,
                  gmailClientSecret: config.emailAutomation.gmailClientSecret,
                  gmailRefreshToken: config.emailAutomation.gmailRefreshToken,
                },
              }),
            );
          }

          if (selectedSaleRecipient) {
            emailTasks.push(
              safeSendLeadEmail({
                data: {
                  provider: config.emailAutomation.provider,
                  to: selectedSaleRecipient,
                  from: config.emailAutomation.fromEmail,
                  subject: fill(config.emailAutomation.notifySubject),
                  text: `${fill(config.emailAutomation.notifyBody)}\n\n${fill(config.emailAutomation.salesCtaLabel || "Mở lead trong CRM")}: ${resolveCtaUrl(config.emailAutomation.salesCtaUrl || config.emailAutomation.ctaUrl)}`,
                  html: htmlBody(config.emailAutomation.notifyBody, "sales"),
                  resendApiKey: config.emailAutomation.resendApiKey,
                  gmailClientId: config.emailAutomation.gmailClientId,
                  gmailClientSecret: config.emailAutomation.gmailClientSecret,
                  gmailRefreshToken: config.emailAutomation.gmailRefreshToken,
                },
              }),
            );
          } else if (directNotify) {
            emailTasks.push(
              safeSendLeadEmail({
                data: {
                  provider: config.emailAutomation.provider,
                  to: directNotify,
                  from: config.emailAutomation.fromEmail,
                  subject: fill(config.emailAutomation.notifySubject),
                  text: `${fill(config.emailAutomation.notifyBody)}\n\n${fill(config.emailAutomation.salesCtaLabel || "Mở lead trong CRM")}: ${resolveCtaUrl(config.emailAutomation.salesCtaUrl || config.emailAutomation.ctaUrl)}`,
                  html: htmlBody(config.emailAutomation.notifyBody, "sales"),
                  resendApiKey: config.emailAutomation.resendApiKey,
                  gmailClientId: config.emailAutomation.gmailClientId,
                  gmailClientSecret: config.emailAutomation.gmailClientSecret,
                  gmailRefreshToken: config.emailAutomation.gmailRefreshToken,
                },
              }),
            );
          }

          // Không gửi thêm webhook cho việc gán sale: kết quả phân bổ đã nằm
          // trong trường sale_align của lần gửi lead duy nhất ở trên.

          const emailTimeout = new Promise<EmailTaskResult[]>((resolve) =>
            window.setTimeout(
              () =>
                resolve(
                  emailTasks.map(() => ({
                    sent: false,
                    reason: "timeout",
                    detail: "Email gửi quá 8 giây, bỏ qua để không chặn submit",
                  })),
                ),
              8_000,
            ),
          );
          const emailResults = await Promise.race([
            Promise.all(emailTasks),
            emailTimeout,
          ]);
          const failedEmail = emailResults.find((result) => !result.sent);
          if (failedEmail) {
            emailDeliveryFailed = true;
            // Chỉ log cho Admin (xem trong console / server logs). KHÔNG chặn luồng
            // submit và KHÔNG hiện chi tiết cấu hình email cho khách hàng: lead đã
            // được lưu và webhook đã gửi, nên với khách đây vẫn là submit thành công.
            console.warn(
              `[v0] Auto-email failed (reason=${failedEmail.reason || "provider_error"}):`,
              failedEmail.detail || failedEmail,
            );
            // Chỉ log: mỗi lần submit chỉ được gửi webhook đúng MỘT lần.
          }
        }
      } catch (emailErr) {
        emailDeliveryFailed = true;
        console.warn(
          "[v0] Auto-email step crashed, submit still succeeds:",
          emailErr,
        );
      }

      // Lỗi email KHÔNG được biến submit của khách thành lỗi: lead đã lưu +
      // webhook đã gửi. emailDeliveryFailed chỉ dùng để log/giám sát.
      void emailDeliveryFailed;

      if (
        webhookDeliveryFailed &&
        shouldTreatSubmitAsFailure({
          leadSaved,
          webhookDeliveryOk: !webhookDeliveryFailed,
        })
      ) {
        setError(
          "Lead chưa lưu thành công. Vui lòng kiểm tra kết nối và thử lại.",
        );
        setStatus("error");
        submittingRef.current = false;
        return;
      }

      // Chỉ bắn tracking SAU khi dữ liệu đã gửi thành công.
      // Lỗi tracking bên thứ ba không được chặn luồng submit của khách.
      try {
        trackLead(
          { content_name: form.major || "Du hoc nghe Trung Quoc" },
          config.tracking.events,
          config.tracking.ga4Id,
        );
      } catch (trackErr) {
        console.warn("[v0] trackLead failed:", trackErr);
      }
      finalizeSuccess();
    } catch (err) {
      console.error("Lead submit failed:", err);
      // Lead đã được ghi nhận: mọi lỗi phát sinh sau đó (webhook/tracking/
      // redirect) chỉ là phụ. Khách vẫn phải thấy trạng thái thành công.
      if (leadSaved) {
        finalizeSuccess();
        return;
      }
      if (!leadSaved) {
        const fallbackPayload = {
          full_name: name.slice(0, 100),
          phone,
          email: email.slice(0, 255),
          city: form.province,
          major: form.major,
          source: "direct",
          landing_url:
            typeof window !== "undefined" ? window.location.href : "",
          created_at: new Date().toISOString(),
        };
        try {
          await Promise.all([
            saveLead(
              {
                id: `ld_${Date.now()}`,
                at: fallbackPayload.created_at,
                name: fallbackPayload.full_name,
                phone: fallbackPayload.phone,
                email: fallbackPayload.email || undefined,
                city: fallbackPayload.city || undefined,
                major: fallbackPayload.major || undefined,
                utmSource: "direct",
                landing_url: fallbackPayload.landing_url,
              },
              config,
            ),
            dispatchLead(config, fallbackPayload),
          ]);
        } catch (fallbackError) {
          console.error("Fallback lead delivery failed:", fallbackError);
        }
      }
      const failureMessage =
        err instanceof Error && err.message.startsWith("Lead đã lưu")
          ? err.message
          : "Có lỗi khi gửi thông tin. Vui lòng kiểm tra kết nối và thử lại.";
      setError(failureMessage);
      submittingRef.current = false;
      setStatus("error");
      toast.error("Gửi chưa thành công", {
        description: failureMessage,
      });
    }
  }

  if (status === "done") {
    return (
      <div
        id={id}
        className="rounded-2xl bg-card p-8 text-center shadow-[var(--shadow-card)] ring-1 ring-border"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold text-2xl font-bold text-gold-foreground">
          ✓
        </div>
        <h3 className="mt-4 text-2xl font-extrabold">Đăng ký thành công!</h3>
        <p className="mt-2 text-muted-foreground">
          Tư vấn viên sẽ liên hệ lại với bạn trong 5 phút. Vui lòng để ý điện
          thoại (cuộc gọi hoặc Zalo).
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-5 text-sm font-bold text-primary underline underline-offset-4"
        >
          Gửi thêm một đăng ký khác
        </button>
      </div>
    );
  }

  return (
    <form
      id={id}
      onSubmit={onSubmit}
      className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border sm:p-8"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-primary">
        Miễn phí 100%
      </p>
      <h2 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">
        {config.form.headline || "Nhận lộ trình du học nghề 0Đ"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Chỉ 30 giây. Chúng tôi gọi lại tư vấn 1:1, không thu bất kỳ khoản phí
        nào.
      </p>

      <div className="mt-5 space-y-3">
        {/* Honeypot ẩn chống bot — người thật không nhìn thấy */}
        <input
          ref={honeypotRef}
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        {/* Hub UTM Catch-All: nhét TOÀN BỘ tham số thu gom được vào các
            <input type="hidden"> để nếu form submit theo kiểu HTML POST truy��n
            thống (kể cả khi bị in-app browser chặn JS), backend vẫn nhận đủ
            100% "vết tích" của đường link. */}
        <UtmHiddenFields model="last" />
        <input
          required
          maxLength={100}
          value={form.name}
          onChange={set("name")}
          onFocus={onFirstInteract}
          placeholder={field("name", "Họ và tên")}
          className={inputClass}
        />
        <input
          required
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          value={form.phone}
          onChange={setPhone}
          onFocus={onFirstInteract}
          onPaste={() => markCopyPaste("sdt")}
          placeholder={field("phone", "Số điện thoại (Zalo) — 10 số")}
          className={inputClass}
        />
        <input
          type="email"
          maxLength={255}
          value={form.email}
          onChange={set("email")}
          onFocus={onFirstInteract}
          placeholder={field("email", "Email (không bắt buộc)")}
          className={inputClass}
        />
        <select
          required
          aria-label={field("city", "Tỉnh/Thành phố")}
          value={form.province}
          onChange={set("province")}
          className={inputClass}
        >
          <option value="">{field("city", "Tỉnh/Thành phố")}</option>
          {PROVINCE_GROUPS.map((g) => (
            <optgroup key={g.region} label={g.region}>
              {g.provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          required
          aria-label={field("major", "Ngành quan tâm")}
          value={form.major}
          onChange={setMajor}
          className={inputClass}
        >
          <option value="">{field("major", "Ngành quan tâm")}</option>
          {MAJORS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {status === "error" && error && (
        <p className="mt-3 text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        aria-busy={status === "sending"}
        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-6 py-4 text-base font-extrabold uppercase tracking-wide text-primary-foreground shadow-[var(--shadow-cta)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:text-lg"
      >
        {status === "sending" && (
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
          />
        )}
        {status === "sending"
          ? "Đang gửi..."
          : config.form.ctaLabel || "Gửi đăng ký — Nhận lộ trình"}
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Thông tin của bạn được bảo mật, chỉ dùng để tư vấn hướng nghiệp.
      </p>
    </form>
  );
}
