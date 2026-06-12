import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

export const api = axios.create({ baseURL: BASE + "/api" });

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type Priority = "CRITICO" | "ALTO" | "MEDIO" | "BAIXO";

export interface EmailItem {
  id: number;
  message_id: string;
  subject: string;
  sender_email: string;
  sender_name: string;
  body_preview: string;
  received_at: string | null;
  processed_at: string | null;
  priority: Priority;
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
  file_size: number | null;
  file_size_human: string;
  file_type: string;
  saved_at: string | null;
  ai_summary: string;
  has_invoice_data: boolean;
  invoice_data: Record<string, unknown>;
  has_ocr: boolean;
  has_pdf_text: boolean;
  is_malicious: boolean;
  scan_result: string;
  email?: {
    subject: string;
    sender_email: string;
    sender_name: string;
    priority: Priority;
    received_at: string | null;
  };
}

export interface ProcessingLogItem {
  id: number;
  action: string;
  details: Record<string, unknown> | null;
  timestamp: string;
  duration_ms: number | null;
  success: boolean;
  error_type: string;
  error_message: string;
  context: Record<string, unknown> | null;
}

export interface SystemSettings {
  app_name: string;
  app_version: string;
  environment: string;
  check_interval_seconds: number;
  max_emails_per_batch: number;
  whatsapp_provider: string;
  whatsapp_to_number: string;
  claude_model: string;
  log_retention_days: number;
  outlook_email: string;
  cors_origins: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const fetchStats = (): Promise<DashboardStats> =>
  api.get("/dashboard/stats").then((r) => r.data);

export const fetchRecentEmails = (limit = 50): Promise<PaginatedResponse<EmailItem>> =>
  api.get(`/dashboard/recent-emails?limit=${limit}`).then((r) => r.data);

export const fetchNotifications = (limit = 30): Promise<NotificationItem[]> =>
  api.get(`/dashboard/notifications?limit=${limit}`).then((r) => r.data);

export const fetchHealth = () => api.get("/dashboard/health").then((r) => r.data);

// ─── E-mails ─────────────────────────────────────────────────────────────────

export const fetchEmails = (
  params?: Record<string, string | number | boolean>
): Promise<PaginatedResponse<EmailItem>> =>
  api.get("/emails", { params }).then((r) => r.data);

export const fetchEmail = (id: number): Promise<EmailItem> =>
  api.get(`/emails/${id}`).then((r) => r.data);

export const reclassifyEmail = (id: number) =>
  api.post(`/emails/${id}/reclassify`).then((r) => r.data);

export const updateEmailPriority = (id: number, priority: Priority) =>
  api.patch(`/emails/${id}/priority`, { priority }).then((r) => r.data);

// ─── Notificações ─────────────────────────────────────────────────────────────

export const fetchAllNotifications = (
  params?: Record<string, string | number>
): Promise<PaginatedResponse<NotificationItem>> =>
  api.get("/notifications", { params }).then((r) => r.data);

export const retryNotification = (id: number) =>
  api.post(`/notifications/${id}/retry`).then((r) => r.data);

export const sendManualNotification = (emailId: number) =>
  api.post("/notifications/manual", { email_id: emailId }).then((r) => r.data);

// ─── Anexos ───────────────────────────────────────────────────────────────────

export const fetchAttachments = (
  params?: Record<string, string | number | boolean>
): Promise<PaginatedResponse<AttachmentItem>> =>
  api.get("/attachments", { params }).then((r) => r.data);

export const fetchAttachmentStats = () =>
  api.get("/attachments/stats").then((r) => r.data);

// ─── Logs ────────────────────────────────────────────────────────────────────

export const fetchProcessingLogs = (limit = 100): Promise<ProcessingLogItem[]> =>
  api.get(`/dashboard/processing-logs?limit=${limit}`).then((r) => r.data);

// ─── Configurações ────────────────────────────────────────────────────────────

export const fetchSettings = (): Promise<SystemSettings> =>
  api.get("/settings").then((r) => r.data);

export const fetchKeywords = () =>
  api.get("/settings/keywords").then((r) => r.data);

export const triggerCheck = () =>
  api.post("/settings/trigger-check").then((r) => r.data);

export const triggerDailySummary = () =>
  api.post("/settings/trigger-summary").then((r) => r.data);
