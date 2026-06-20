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

export const fetchStats = (): Promise<DashboardStats> =>
  api.get("/dashboard/stats").then((r) => r.data);

export const fetchRecentEmails = (limit = 50): Promise<{ items: EmailItem[]; total: number }> =>
  api.get(`/dashboard/recent-emails?limit=${limit}`).then((r) => r.data);

export const fetchNotifications = (limit = 30): Promise<NotificationItem[]> =>
  api.get(`/dashboard/notifications?limit=${limit}`).then((r) => r.data);

export const fetchHealth = () => api.get("/dashboard/health").then((r) => r.data);

export const triggerCheck = () => api.post("/settings/trigger-check").then((r) => r.data);

export const fetchEmails = (params?: Record<string, string | number | boolean>) =>
  api.get("/emails", { params }).then((r) => r.data);

export interface AttachmentItem {
  id: number;
  email_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  saved_at: string | null;
  has_ocr: boolean;
  has_pdf_text: boolean;
  invoice_data: Record<string, unknown> | null;
  sender_email: string;
  sender_name: string;
  email_subject: string;
}

export interface ProcessingLogItem {
  id: number;
  action: string;
  success: boolean;
  duration_ms: number | null;
  timestamp: string;
  error_type: string | null;
  error_message: string | null;
  details: Record<string, unknown> | null;
}

export const fetchAttachments = (params?: Record<string, string | number>) =>
  api.get("/attachments", { params }).then((r) => r.data) as Promise<{ total: number; items: AttachmentItem[] }>;

export const fetchAttachmentStats = () =>
  api.get("/attachments/stats").then((r) => r.data);

export const fetchProcessingLogs = (limit = 100) =>
  api.get(`/dashboard/processing-logs?limit=${limit}`).then((r) => r.data) as Promise<ProcessingLogItem[]>;

export const fetchSettings = () =>
  api.get("/settings").then((r) => r.data);

export const fetchKeywords = () =>
  api.get("/settings/keywords").then((r) => r.data);

export const triggerSummary = () =>
  api.post("/settings/trigger-summary").then((r) => r.data);

export const retryNotification = (id: number) =>
  api.post(`/notifications/${id}/retry`).then((r) => r.data);

export const reclassifyEmail = (id: number) =>
  api.post(`/emails/${id}/reclassify`).then((r) => r.data);
