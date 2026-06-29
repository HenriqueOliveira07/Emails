import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

export const api = axios.create({ baseURL: BASE + "/api" });

// ─── Types ────────────────────────────────────────────────────────────────────

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
  file_type: string;
  saved_at: string | null;
  has_ocr: boolean;
  has_pdf_text: boolean;
  has_ai_summary: boolean;
  invoice_data: Record<string, string>;
  is_malicious: boolean;
  sender_email: string;
  sender_name: string;
  email_subject: string;
}

export interface AttachmentStats {
  total_attachments: number;
  total_size_bytes: number;
  total_size_mb: number;
  with_ocr: number;
  with_pdf_text: number;
}

export interface LogItem {
  id: number;
  action: string;
  success: boolean;
  duration_ms: number | null;
  timestamp: string | null;
  error_type: string;
  error_message: string;
  details: Record<string, unknown>;
  context: Record<string, unknown>;
}

export interface LogStats {
  total_today: number;
  errors_today: number;
  total_all: number;
  errors_all: number;
  actions_today: Record<string, number>;
}

export interface SettingsData {
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

export interface HealthData {
  overall: string;
  services: Record<string, { status: string; error?: string }>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const fetchStats = (): Promise<DashboardStats> =>
  api.get("/dashboard/stats").then((r) => r.data);

export const fetchRecentEmails = (limit = 50): Promise<{ items: EmailItem[]; total: number }> =>
  api.get(`/dashboard/recent-emails?limit=${limit}`).then((r) => r.data);

export const fetchNotifications = (limit = 30): Promise<NotificationItem[]> =>
  api.get(`/dashboard/notifications?limit=${limit}`).then((r) => r.data);

export const fetchHealth = (): Promise<HealthData> =>
  api.get("/dashboard/health").then((r) => r.data);

export const triggerCheck = () => api.post("/settings/trigger-check").then((r) => r.data);

export const triggerSummary = () => api.post("/settings/trigger-summary").then((r) => r.data);

// ─── Emails ───────────────────────────────────────────────────────────────────

export const fetchEmails = (params?: Record<string, string | number | boolean>): Promise<{ items: EmailItem[]; limit: number; offset: number }> =>
  api.get("/emails", { params }).then((r) => r.data);

export const fetchEmailDetail = (id: number): Promise<EmailItem & { full_body: string; keywords_found: string[]; recipients: string[] }> =>
  api.get(`/emails/${id}`).then((r) => r.data);

export const reclassifyEmail = (id: number) =>
  api.post(`/emails/${id}/reclassify`).then((r) => r.data);

export const updatePriority = (id: number, priority: string) =>
  api.patch(`/emails/${id}/priority`, { priority }).then((r) => r.data);

// ─── Notifications ────────────────────────────────────────────────────────────

export const fetchAllNotifications = (limit = 50): Promise<NotificationItem[]> =>
  api.get(`/notifications?limit=${limit}`).then((r) => r.data);

export const retryNotification = (id: number) =>
  api.post(`/notifications/${id}/retry`).then((r) => r.data);

// ─── Attachments ──────────────────────────────────────────────────────────────

export const fetchAttachments = (params?: Record<string, string | number>): Promise<{ items: AttachmentItem[]; total: number }> =>
  api.get("/attachments", { params }).then((r) => r.data);

export const fetchAttachmentStats = (): Promise<AttachmentStats> =>
  api.get("/attachments/stats").then((r) => r.data);

// ─── Logs ─────────────────────────────────────────────────────────────────────

export const fetchLogs = (params?: Record<string, string | number | boolean>): Promise<{ items: LogItem[]; total: number }> =>
  api.get("/logs", { params }).then((r) => r.data);

export const fetchLogStats = (): Promise<LogStats> =>
  api.get("/logs/stats").then((r) => r.data);

// ─── Settings ─────────────────────────────────────────────────────────────────

export const fetchSettings = (): Promise<SettingsData> =>
  api.get("/settings").then((r) => r.data);

export const fetchKeywords = (): Promise<Record<string, string[]>> =>
  api.get("/settings/keywords").then((r) => r.data);
