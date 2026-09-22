const SHEET_NAME = "Leads";
const DEDUPE_PREFIX = "tvq10_lead_";

function removeLegacyTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    var handler = trigger.getHandlerFunction();
    if (
      handler === "autoRemoveEmptyRows" ||
      handler === "myFunction" ||
      handler === "removeLegacyTriggers"
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  return "Legacy triggers removed";
}

function doGet() {
  var properties = PropertiesService.getScriptProperties();
  return jsonResponse({
    ok: true,
    service: "tvq10-google-sheets-webhook",
    last_received_at: properties.getProperty("tvq10_last_received_at") || "",
    last_delivery_id: properties.getProperty("tvq10_last_delivery_id") || "",
    last_error: properties.getProperty("tvq10_last_error") || "",
  });
}

// Chạy thủ công hàm này trong Apps Script để kiểm tra quyền ghi vào Sheet.
// Không chạy doPost bằng nút Run vì doPost cần HTTP event từ Web App.
function testWebhookInSheet() {
  var payload = {
    event: "sheets_manual_test",
    webhook_delivery_id: "manual-test-" + new Date().getTime(),
    idempotency_key: "manual-test-" + new Date().getTime(),
    full_name: "Test Google Sheets webhook",
    phone: "0900000000",
    email: "",
    city: "Hà Nội",
    major: "manual_test",
    source: "apps_script_test",
  };
  var result = writePayload(payload);
  Logger.log(JSON.stringify(result));
  return result;
}

function doPost(event) {
  try {
    const payload = parsePayload(event);
    var result = writePayload(payload);
    var properties = PropertiesService.getScriptProperties();
    properties.setProperty("tvq10_last_received_at", new Date().toISOString());
    properties.setProperty(
      "tvq10_last_delivery_id",
      String(payload.webhook_delivery_id || payload.idempotency_key || ""),
    );
    properties.deleteProperty("tvq10_last_error");
    return jsonResponse(result);
  } catch (error) {
    PropertiesService.getScriptProperties().setProperty(
      "tvq10_last_error",
      String(error && error.message ? error.message : error),
    );
    return jsonResponse(
      {
        ok: false,
        error: String(error && error.message ? error.message : error),
      },
      500,
    );
  }
}

function writePayload(payload) {
  const idempotencyKey = String(
    payload.idempotency_key || payload.webhook_delivery_id || "",
  ).trim();
  const selectedFields = Array.isArray(payload.sheet_fields)
    ? payload.sheet_fields.map(String).filter(Boolean)
    : null;
  // Ánh xạ biến payload -> tên cột trong Sheet. Website gửi kèm "sheet_columns".
  const columnMap =
    payload.sheet_columns &&
    typeof payload.sheet_columns === "object" &&
    !Array.isArray(payload.sheet_columns)
      ? payload.sheet_columns
      : {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    if (
      idempotencyKey &&
      properties.getProperty(DEDUPE_PREFIX + idempotencyKey)
    ) {
      return { ok: true, duplicate: true, idempotency_key: idempotencyKey };
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new Error("Script chưa được gắn với Google Sheet");
    const sheet =
      spreadsheet.getSheetByName(SHEET_NAME) ||
      spreadsheet.insertSheet(SHEET_NAME);
    const allHeaders = [
      "received_at",
      "event",
      "webhook_delivery_id",
      "idempotency_key",
      "created_at",
      "full_name",
      "phone",
      "email",
      "city",
      "major",
      "source",
      "sale_align",
      "sale_assigned_to",
      "sales_distribution_mode",
      "sales_email_recipients",
      "sales_distribution_weights",
      "sales_send_webhook",
      "email_automation_enabled",
      "email_provider",
      "email_from_configured",
      "email_customer_template",
      "email_sales_template",
      "email_customer_cta_url",
      "email_sales_cta_url",
      "landing_url",
      "ab_variant",
      "ai_score",
      "ai_rank",
      "risk_level",
      "risk_reasons",
      "recommended_action",
      "sale_advice",
      "behavior_summary",
      "device_tech_info",
      "traffic_ads_source",
      "visits_today",
      "visits_month",
      "current_session",
      "device_manufacturer",
      "device_family",
      "device_model_name",
      "operating_system",
      "browser",
      "network_provider",
      "network_label",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "ttclid",
      "fbclid",
      "gclid",
      "referrer",
      "attribution_model",
      "attribution_detected_by",
      "raw_query",
      "utm_params",
      "raw_payload",
    ];
    // sourceFields: khóa payload dùng để lấy giá trị (giữ thứ tự Admin chọn).
    const sourceFields = selectedFields
      ? ["received_at"]
          .concat(
            selectedFields.filter(function (field) {
              return (
                allHeaders.indexOf(field) >= 0 &&
                field !== "received_at" &&
                field !== "raw_payload"
              );
            }),
          )
          .concat(["raw_payload"])
      : allHeaders;
    // headers: tiêu đề cột hiển thị trong Sheet (theo columnMap nếu có).
    const headers = sourceFields.map(function (field) {
      var mapped = columnMap[field];
      return typeof mapped === "string" && mapped.trim()
        ? mapped.trim()
        : field;
    });
    ensureHeaders(sheet, headers);
    sheet.appendRow(
      sourceFields.map(function (field) {
        if (field === "received_at") return new Date();
        if (field === "raw_payload") return JSON.stringify(payload);
        return valueForSheet(payload[field]);
      }),
    );
    if (idempotencyKey) {
      properties.setProperty(
        DEDUPE_PREFIX + idempotencyKey,
        new Date().toISOString(),
      );
    }
    return { ok: true, duplicate: false, idempotency_key: idempotencyKey };
  } finally {
    lock.releaseLock();
  }
}

function parsePayload(event) {
  if (event && event.parameter && event.parameter.payload) {
    return parseJsonPayload(event.parameter.payload);
  }
  if (!event || !event.postData || !event.postData.contents) {
    throw new Error("Missing JSON request body");
  }
  var raw = String(event.postData.contents || "").trim();
  // Accept both application/json and the simple form POST used by the site.
  // Some Apps Script deployments do not populate event.parameter reliably.
  if (raw.indexOf("payload=") === 0) {
    return parseJsonPayload(decodeURIComponent(raw.slice("payload=".length)));
  }
  return parseJsonPayload(raw);
}

function parseJsonPayload(raw) {
  const payload = JSON.parse(raw);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Payload must be a JSON object");
  }
  return payload;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }
  const width = Math.max(sheet.getLastColumn(), headers.length);
  const current = sheet.getRange(1, 1, 1, width).getValues()[0];
  const matches = headers.every(function (header, index) {
    return current[index] === header;
  });
  if (matches) return;
  // Đổi tên cột trong Admin => ghi đè lại hàng tiêu đề, KHÔNG chèn hàng mới
  // (chèn hàng sẽ tạo nhiều hàng tiêu đề trùng lặp trong Sheet).
  if (headers.length < width) {
    sheet.getRange(1, headers.length + 1, 1, width - headers.length).clearContent();
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function valueForSheet(value) {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).slice(0, 49000);
}

function jsonResponse(body, status) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
