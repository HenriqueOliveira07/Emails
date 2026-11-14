import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/QueryProvider";
import { AuthGate } from "@/components/Layout/AuthGate";

export const metadata: Metadata = {
  title: "Monitor de E-mails",
  description: "Sistema automatizado de monitoramento de e-mails com notificações via WhatsApp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <QueryProvider>
          <AuthGate>{children}</AuthGate>
        </QueryProvider>
      </body>
    </html>
  );
}
