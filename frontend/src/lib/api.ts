import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

export const api = axios.create({ baseURL: BASE + "/api" });

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

export interface EmailDetail extends EmailItem {
  full_body: string;
  keywords_found: string[];
  recipients: string[];
  raw_data: Record<string, unknown>;
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
  invoice_data: Record<string, unknown>;
}

export interface ProcessingLogItem {
  id: number;
  action: string;
  success: boolean;
  duration_ms: number | null;
  timestamp: string;
  error_type: string;
  error_message: string;
  details: Record<string, unknown>;
}

export interface HealthStatus {
  overall: string;
  services: Record<string, { status: string; error?: string }>;
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

// Dashboard
export const fetchStats = (): Promise<DashboardStats> =>
  api.get("/dashboard/stats").then((r) => r.data);

export const fetchRecentEmails = (limit = 50): Promise<{ items: EmailItem[]; total: number }> =>
  api.get(`/dashboard/recent-emails?limit=${limit}`).then((r) => r.data);

export const fetchNotifications = (limit = 30): Promise<NotificationItem[]> =>
  api.get(`/dashboard/notifications?limit=${limit}`).then((r) => r.data);

export const fetchHealth = (): Promise<HealthStatus> =>
  api.get("/dashboard/health").then((r) => r.data);

export const fetchProcessingLogs = (limit = 50): Promise<ProcessingLogItem[]> =>
  api.get(`/dashboard/processing-logs?limit=${limit}`).then((r) => r.data);

// Emails
export const fetchEmails = (params?: Record<string, string | number | boolean>) =>
  api.get("/emails", { params }).then((r) => r.data);

export const fetchEmail = (id: number): Promise<EmailDetail> =>
  api.get(`/emails/${id}`).then((r) => r.data);

export const fetchEmailAttachments = (id: number): Promise<AttachmentItem[]> =>
  api.get(`/emails/${id}/attachments`).then((r) => r.data);

export const reclassifyEmail = (id: number) =>
  api.post(`/emails/${id}/reclassify`).then((r) => r.data);

export const updatePriority = (id: number, priority: string) =>
  api.patch(`/emails/${id}/priority`, { priority }).then((r) => r.data);

// Notifications
export const fetchAllNotifications = (limit = 50): Promise<NotificationItem[]> =>
  api.get(`/notifications?limit=${limit}`).then((r) => r.data);

export const retryNotification = (id: number) =>
  api.post(`/notifications/${id}/retry`).then((r) => r.data);

export const sendManualNotification = (email_id: number, message: string) =>
  api.post("/notifications/manual", { email_id, message }).then((r) => r.data);

// Settings
export const fetchSettings = (): Promise<SystemSettings> =>
  api.get("/settings").then((r) => r.data);

export const fetchKeywords = () =>
  api.get("/settings/keywords").then((r) => r.data);

export const triggerCheck = () =>
  api.post("/settings/trigger-check").then((r) => r.data);

export const triggerSummary = () =>
  api.post("/settings/trigger-summary").then((r) => r.data);
