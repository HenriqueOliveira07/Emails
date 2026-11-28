import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

export const api = axios.create({ baseURL: BASE + "/api" });

export const API_KEY_STORAGE = "email-monitor-api-key";

export function getApiKey(): string {
  try {
    return window.localStorage.getItem(API_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function setApiKey(key: string) {
  try {
    window.localStorage.setItem(API_KEY_STORAGE, key);
  } catch {
    /* armazenamento indisponível */
  }
}

// Envia a chave de acesso (X-API-Key) em todas as requisições
api.interceptors.request.use((config) => {
  const key = typeof window !== "undefined" ? getApiKey() : "";
  if (key) config.headers.set("X-API-Key", key);
  return config;
});

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
  file_size: number;
  file_type: string;
  sender_email: string;
  subject: string;
  received_at: string | null;
  has_invoice_data: boolean;
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

export const fetchAttachments = (
  params?: Record<string, string | number>
): Promise<{ items: AttachmentItem[]; total: number; page: number; page_size: number }> =>
  api.get("/attachments", { params }).then((r) => r.data);

export async function downloadAttachment(att: AttachmentItem) {
  const r = await api.get(`/attachments/${att.id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(r.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = att.original_filename || att.filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const fetchProcessingLogs = (limit = 200): Promise<ProcessingLogItem[]> =>
  api.get(`/dashboard/processing-logs?limit=${limit}`).then((r) => r.data);

export const fetchAllNotifications = (limit = 200): Promise<NotificationItem[]> =>
  api.get(`/notifications?limit=${limit}`).then((r) => r.data);

export const retryNotification = (id: number) =>
  api.post(`/notifications/${id}/retry`).then((r) => r.data);

export const fetchSettings = () => api.get("/settings").then((r) => r.data);
