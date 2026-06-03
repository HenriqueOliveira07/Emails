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
  is_malicious: boolean;
  scan_result: string;
}

export interface AttachmentStats {
  total_attachments: number;
  total_size_bytes: number;
  total_size_mb: number;
  disk_usage_mb: number;
  with_ocr_text: number;
  with_pdf_text: number;
  malicious_blocked: number;
}

export interface ProcessingLog {
  id: number;
  action: string;
  success: boolean;
  duration_ms: number | null;
  timestamp: string;
  error_type: string;
  error_message: string;
  details: Record<string, unknown> | null;
}

export interface LogStats {
  date: string;
  total_logs: number;
  errors: number;
  success_rate: number;
  by_action: Record<string, number>;
  avg_processing_ms: number | null;
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

export interface HealthStatus {
  overall: string;
  services: Record<string, { status: string; error?: string }>;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const fetchStats = (): Promise<DashboardStats> =>
  api.get("/dashboard/stats").then((r) => r.data);

export const fetchRecentEmails = (limit = 50): Promise<{ items: EmailItem[]; total: number }> =>
  api.get(`/dashboard/recent-emails?limit=${limit}`).then((r) => r.data);

export const fetchNotifications = (limit = 30): Promise<NotificationItem[]> =>
  api.get(`/dashboard/notifications?limit=${limit}`).then((r) => r.data);

export const fetchHealth = (): Promise<HealthStatus> =>
  api.get("/dashboard/health").then((r) => r.data);

// ─── E-mails ─────────────────────────────────────────────────────────────────

export const fetchEmails = (params?: Record<string, string | number | boolean>) =>
  api.get<{ items: EmailItem[]; limit: number; offset: number }>(
    "/emails", { params }
  ).then((r) => r.data);

export const fetchEmail = (id: number) =>
  api.get<EmailItem & { full_body: string; keywords_found: string[]; recipients: string[] }>(
    `/emails/${id}`
  ).then((r) => r.data);

export const reclassifyEmail = (id: number) =>
  api.post<{ success: boolean; new_priority: string; ai_result: Record<string, unknown> }>(
    `/emails/${id}/reclassify`
  ).then((r) => r.data);

export const updateEmailPriority = (id: number, priority: string) =>
  api.patch(`/emails/${id}/priority`, { priority }).then((r) => r.data);

// ─── Notificações ─────────────────────────────────────────────────────────────

export const fetchAllNotifications = (params?: { limit?: number; offset?: number }) =>
  api.get<NotificationItem[]>("/notifications", { params }).then((r) => r.data);

export const retryNotification = (id: number) =>
  api.post(`/notifications/${id}/retry`).then((r) => r.data);

export const sendManualNotification = (email_id: number, message: string) =>
  api.post("/notifications/manual", { email_id, message }).then((r) => r.data);

// ─── Anexos ──────────────────────────────────────────────────────────────────

export const fetchAttachments = (params?: Record<string, string | number | boolean>) =>
  api.get<{ items: AttachmentItem[]; total: number; limit: number; offset: number }>(
    "/attachments", { params }
  ).then((r) => r.data);

export const fetchAttachmentStats = (): Promise<AttachmentStats> =>
  api.get("/attachments/stats").then((r) => r.data);

export const summarizeAttachment = (id: number) =>
  api.post<{ success: boolean; summary: string }>(`/attachments/${id}/summarize`).then((r) => r.data);

// ─── Logs ────────────────────────────────────────────────────────────────────

export const fetchLogs = (params?: Record<string, string | number | boolean>) =>
  api.get<{ items: ProcessingLog[]; total: number; limit: number; offset: number }>(
    "/logs", { params }
  ).then((r) => r.data);

export const fetchLogStats = (): Promise<LogStats> =>
  api.get("/logs/stats").then((r) => r.data);

// ─── Configurações ────────────────────────────────────────────────────────────

export const fetchSettings = (): Promise<SystemSettings> =>
  api.get("/settings").then((r) => r.data);

export const fetchKeywords = () =>
  api.get<Record<string, string[]>>("/settings/keywords").then((r) => r.data);

export const triggerCheck = () =>
  api.post<{ task_id: string; status: string; message: string }>("/settings/trigger-check").then((r) => r.data);

export const triggerSummary = () =>
  api.post<{ task_id: string; status: string; message: string }>("/settings/trigger-summary").then((r) => r.data);

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function humanFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  for (const unit of units) {
    if (size < 1024) return `${size.toFixed(1)} ${unit}`;
    size /= 1024;
  }
  return `${size.toFixed(1)} TB`;
}
