-- ============================================================
-- Inicialização do banco de dados
-- Sistema de Monitoramento de E-mails
-- ============================================================

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Busca por similaridade de texto

-- Índices adicionais para performance (além dos criados pelo SQLAlchemy)

-- Busca full-text no assunto e remetente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_subject_trgm
    ON email_records USING gin (subject gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_sender_trgm
    ON email_records USING gin (sender_email gin_trgm_ops);

-- Índice composto para listagem por data e prioridade
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_priority_date
    ON email_records (priority, received_at DESC)
    WHERE is_spam = FALSE;

-- Índice para busca de e-mails não notificados críticos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_pending_notification
    ON email_records (priority, whatsapp_sent, received_at DESC)
    WHERE is_spam = FALSE AND whatsapp_sent = FALSE;

-- Índice para logs por ação e timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_log_action_time
    ON processing_logs (action, timestamp DESC);

-- View materializada para estatísticas rápidas (opcional, requer refresh periódico)
CREATE OR REPLACE VIEW v_daily_stats AS
SELECT
    DATE(processed_at AT TIME ZONE 'America/Sao_Paulo') AS dia,
    COUNT(*) FILTER (WHERE is_spam = FALSE) AS total_emails,
    COUNT(*) FILTER (WHERE priority = 'CRITICO' AND is_spam = FALSE) AS criticos,
    COUNT(*) FILTER (WHERE priority = 'ALTO' AND is_spam = FALSE) AS altos,
    COUNT(*) FILTER (WHERE priority = 'MEDIO' AND is_spam = FALSE) AS medios,
    COUNT(*) FILTER (WHERE priority = 'BAIXO' AND is_spam = FALSE) AS baixos,
    COUNT(*) FILTER (WHERE is_spam = TRUE) AS spam,
    COUNT(*) FILTER (WHERE whatsapp_sent = TRUE) AS notificados,
    AVG(processing_time_ms) FILTER (WHERE is_spam = FALSE) AS tempo_medio_ms
FROM email_records
WHERE processed_at IS NOT NULL
GROUP BY DATE(processed_at AT TIME ZONE 'America/Sao_Paulo')
ORDER BY dia DESC;

-- Comentários nas tabelas para documentação
COMMENT ON TABLE email_records IS 'Registro de e-mails processados pelo sistema de monitoramento';
COMMENT ON TABLE email_attachments IS 'Anexos de e-mail salvos no sistema de arquivos';
COMMENT ON TABLE notification_logs IS 'Log de notificações enviadas via WhatsApp ou outros canais';
COMMENT ON TABLE processing_logs IS 'Log de eventos e ações do sistema para auditoria';
