"use client";
import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeStats() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const base = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/^https?/, protocol)
      : `${protocol}://${window.location.host}`;
    const ws = new WebSocket(`${base}/ws/dashboard`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "stats_update") {
          qc.setQueryData(["stats"], {
            date: data.date,
            total_emails: data.total_emails,
            by_priority: data.by_priority,
            spam: data.spam,
            attachments_saved: data.attachments_saved,
            whatsapp_sent: data.whatsapp_sent,
            errors: data.errors,
          });
        }
        if (data.type === "new_email") {
          qc.invalidateQueries({ queryKey: ["recent-emails"] });
          qc.invalidateQueries({ queryKey: ["emails"] });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      reconnectRef.current = setTimeout(connect, 5000);
    };
  }, [qc]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);
}
