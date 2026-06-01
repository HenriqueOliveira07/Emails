import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

export const api = axios.create({ baseURL: BASE + "/api" });

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EmailItem {
  id: number;
  message_id: string;
  subject: string;
  sender_email: string;
  sender_name: string;
  body_preview: string;
  received_at: string | null;
  processed_at: string | null;
  priority: "CRITICO" | "ALTO" | "MEDIO" | "BAIXO";
  category: string;
  ai_summary: string;
  action_required: boolean;
  has_attachments: boolean;
  attachment_count: number;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  is_spam: boolean;
  processing_time_ms: number | null;
}

export interface DashboardStats {
  date: string;
  total_emails: number;
  by_priority: Record<string, number>;
  spam: number;
  attachments_saved: number;
  whatsapp_sent: number;
  errors: number;
}

export interface NotificationItem {
  id: number;
  email_id: number | null;
  channel: string;
  recipient: string;
  message_body: string;
  status: string;
  sent_at: string | null;
  error_message: string;
  retry_count: number;
  external_id: string;
  created_at: string | null;
}

export interface AttachmentItem {
  id: number;
  email_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  file_size_human: string;
  file_type: string;
  saved_at: string | null;
  has_ocr: boolean;
  has_pdf_text: boolean;
  has_ai_summary: boolean;
  invoice_data: Record<string, unknown> | null;
  is_malicious: boolean;
}

export interface AttachmentStats {
  total_count: number;
  total_size_bytes: number;
  total_size_human: string;
  disk_usage_mb: number;
  by_type: Record<string, number>;
  malicious_count: number;
}

export interface LogItem {
  id: number;
  action: string;
  success: boolean;
  duration_ms: number | null;
  timestamp: string | null;
  error_type: string;
  error_message: string;
  details: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
}

export interface LogSummary {
  period_hours: number;
  total_events: number;
  error_count: number;
  success_rate: number;
  by_action: Array<{ action: string; count: number; avg_duration_ms: number }>;
}

export interface SystemSettings {
  app_name: string;
  app_version: string;
  environment: string;
  check_interval_seconds: number;
  max_emails_per_batch: number;
  max_attachment_size_mb: number;
  claude_model: string;
  whatsapp_provider: string;
  log_retention_days: number;
  integrations: {
    outlook_configured: boolean;
    whatsapp_configured: boolean;
    claude_configured: boolean;
    email_address: string;
    whatsapp_to: string;
  };
  priority_keywords: {
    critical: string[];
    high: string[];
    medium: string[];
  };
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export const fetchStats = (): Promise<DashboardStats> =>
  api.get("/dashboard/stats").then((r) => r.data);

export const fetchRecentEmails = (limit = 50): Promise<{ items: EmailItem[]; total: number }> =>
  api.get(`/dashboard/recent-emails?limit=${limit}`).then((r) => r.data);

export const fetchNotifications = (limit = 30): Promise<NotificationItem[]> =>
  api.get(`/dashboard/notifications?limit=${limit}`).then((r) => r.data);

export const fetchHealth = () => api.get("/dashboard/health").then((r) => r.data);

// ─── Emails ─────────────────────────────────────────────────────────────────

export const fetchEmails = (params?: Record<string, string | number | boolean>) =>
  api.get("/emails", { params }).then((r) => r.data);

export const fetchEmail = (id: number) =>
  api.get(`/emails/${id}`).then((r) => r.data);

export const reclassifyEmail = (id: number) =>
  api.post(`/emails/${id}/reclassify`).then((r) => r.data);

export const updateEmailPriority = (id: number, priority: string) =>
  api.patch(`/emails/${id}/priority`, { priority }).then((r) => r.data);

// ─── Notifications ──────────────────────────────────────────────────────────

export const fetchNotificationsAll = (limit = 200): Promise<NotificationItem[]> =>
  api.get(`/notifications?limit=${limit}`).then((r) => r.data);

export const retryNotification = (id: number) =>
  api.post(`/notifications/${id}/retry`).then((r) => r.data);

export const sendManualNotification = (emailId: number, message: string) =>
  api.post("/notifications/manual", { email_id: emailId, message }).then((r) => r.data);

// ─── Attachments ────────────────────────────────────────────────────────────

export const fetchAttachments = (
  params?: Record<string, string | number | boolean>
): Promise<{ items: AttachmentItem[]; total: number }> =>
  api.get("/attachments", { params }).then((r) => r.data);

export const fetchAttachmentStats = (): Promise<AttachmentStats> =>
  api.get("/attachments/stats").then((r) => r.data);

export const summarizeAttachment = (id: number) =>
  api.post(`/attachments/${id}/summarize`).then((r) => r.data);

// ─── Logs ───────────────────────────────────────────────────────────────────

export const fetchLogs = (
  params?: Record<string, string | number | boolean>
): Promise<{ items: LogItem[]; total: number }> =>
  api.get("/logs", { params }).then((r) => r.data);

export const fetchLogSummary = (): Promise<LogSummary> =>
  api.get("/logs/summary").then((r) => r.data);

export const fetchLogErrors = (limit = 50): Promise<LogItem[]> =>
  api.get(`/logs/errors?limit=${limit}`).then((r) => r.data);

// ─── Settings ───────────────────────────────────────────────────────────────

export const fetchSettings = (): Promise<SystemSettings> =>
  api.get("/settings").then((r) => r.data);

export const triggerCheck = () =>
  api.post("/settings/trigger-check").then((r) => r.data);

export const triggerSummary = () =>
  api.post("/settings/trigger-summary").then((r) => r.data);
