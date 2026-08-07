-- =============================================================================
-- Row Level Security (RLS) — isolamento de dados no banco (Supabase/Postgres)
-- =============================================================================
-- POR QUE ISTO EXISTE (e não está no schema.prisma):
--   O Prisma não gerencia políticas de RLS. Este arquivo é aplicado À MÃO
--   depois do `prisma db push`, contra a conexão DIRETA do Supabase.
--
-- COMO A ISOLAÇÃO FUNCIONA:
--   O Prisma conecta como `postgres`, que IGNORA RLS (bypassrls = true). Por
--   isso, a cada requisição, o app precisa rodar dentro de uma transação:
--     SET LOCAL ROLE authenticated;                       -- papel que OBEDECE RLS
--     SELECT set_config('app.uid', '<User.id do logado>', true);
--   As políticas abaixo leem current_setting('app.uid') pra decidir o que o
--   usuário logado pode ver. Sem identidade setada, não vê nada.
--
--   Provado ao vivo contra o pooler do Supabase (transaction mode):
--   paciente só vê o dele, médico vê as consultas onde ele é o médico.
--
-- IDEMPOTENTE: pode rodar várias vezes (DROP POLICY IF EXISTS antes de criar).
--
-- COBERTURA ATUAL: Appointment (SELECT). As demais tabelas sensíveis
--   (Payment, UrgencyRequest, Conversation, Message, prontuário) e as políticas
--   de escrita (INSERT/UPDATE) entram conforme cada caminho for religado ao
--   Supabase. NÃO considere este arquivo completo até esta nota sumir.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Appointment — consulta (contém o prontuário: resumoClinico, condutas)
-- ---------------------------------------------------------------------------
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;

-- O papel `authenticated` (usado via SET LOCAL ROLE) precisa de acesso às
-- tabelas; o RLS é que filtra as linhas. SELECT em Doctor é necessário porque
-- a política de médico consulta o vínculo Doctor.userId.
GRANT SELECT ON "Appointment" TO authenticated;
GRANT SELECT ON "Doctor" TO authenticated;

DROP POLICY IF EXISTS appointment_select ON "Appointment";
CREATE POLICY appointment_select ON "Appointment"
  FOR SELECT
  TO authenticated
  USING (
    -- paciente vê as próprias consultas
    "patientId" = current_setting('app.uid', true)
    -- médico vê as consultas onde ELE é o médico (via vínculo User->Doctor)
    OR "doctorId" IN (
      SELECT id FROM "Doctor" WHERE "userId" = current_setting('app.uid', true)
    )
  );
