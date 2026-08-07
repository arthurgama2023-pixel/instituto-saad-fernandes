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
-- COBERTURA ATUAL: Appointment, Payment, UrgencyRequest, Conversation, Message,
--   Documento (todas SELECT). PENDENTE: políticas de INSERT/UPDATE em todas as
--   tabelas, e o hardening de auth nas rotas de médico que hoje confiam em
--   doctorId vindo de query param/body (?d=) sem sessão real — ver comentário
--   em src/lib/doctor-session.ts. NÃO considere este arquivo completo até
--   essas duas notas sumirem.
--
-- `Doctor` propositalmente SEM RLS habilitado (só GRANT SELECT): é usada como
-- alvo de subquery pelas políticas abaixo (`doctorId IN (SELECT id FROM
-- Doctor WHERE userId = ...)`), e habilitar RLS nela exigiria uma política
-- própria só pra manter essas subqueries funcionando — sem ganho de isolamento
-- adicional (Doctor não tem dado sensível de paciente).
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

-- Specialty é catálogo público (nomes/ícones de especialidade, sem dado de
-- paciente) — sem RLS, só GRANT, pro papel authenticated conseguir ler quando
-- uma mesma transação mistura specialties com dados protegidos.
GRANT SELECT ON "Specialty" TO authenticated;

-- ---------------------------------------------------------------------------
-- Payment — sem coluna de dono direta; dono via Appointment (join)
-- ---------------------------------------------------------------------------
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "Payment" TO authenticated;

DROP POLICY IF EXISTS payment_select ON "Payment";
CREATE POLICY payment_select ON "Payment"
  FOR SELECT
  TO authenticated
  USING (
    "appointmentId" IN (
      SELECT id FROM "Appointment"
      WHERE "patientId" = current_setting('app.uid', true)
         OR "doctorId" IN (SELECT id FROM "Doctor" WHERE "userId" = current_setting('app.uid', true))
    )
  );

-- ---------------------------------------------------------------------------
-- UrgencyRequest — colunas de dono diretas (patientId, doctorId nullable)
-- ---------------------------------------------------------------------------
ALTER TABLE "UrgencyRequest" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "UrgencyRequest" TO authenticated;

DROP POLICY IF EXISTS urgencyrequest_select ON "UrgencyRequest";
CREATE POLICY urgencyrequest_select ON "UrgencyRequest"
  FOR SELECT
  TO authenticated
  USING (
    "patientId" = current_setting('app.uid', true)
    OR "doctorId" IN (SELECT id FROM "Doctor" WHERE "userId" = current_setting('app.uid', true))
  );

-- ---------------------------------------------------------------------------
-- Conversation — coluna de dono direta (userId); só paciente, sem vínculo médico
-- ---------------------------------------------------------------------------
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "Conversation" TO authenticated;

DROP POLICY IF EXISTS conversation_select ON "Conversation";
CREATE POLICY conversation_select ON "Conversation"
  FOR SELECT
  TO authenticated
  USING ("userId" = current_setting('app.uid', true));

-- ---------------------------------------------------------------------------
-- Message — sem coluna de dono direta; dono via Conversation.userId (join)
-- ---------------------------------------------------------------------------
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "Message" TO authenticated;

DROP POLICY IF EXISTS message_select ON "Message";
CREATE POLICY message_select ON "Message"
  FOR SELECT
  TO authenticated
  USING (
    "conversationId" IN (SELECT id FROM "Conversation" WHERE "userId" = current_setting('app.uid', true))
  );

-- ---------------------------------------------------------------------------
-- Documento — colunas de dono diretas (patientId, doctorId)
-- ---------------------------------------------------------------------------
ALTER TABLE "Documento" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "Documento" TO authenticated;

DROP POLICY IF EXISTS documento_select ON "Documento";
CREATE POLICY documento_select ON "Documento"
  FOR SELECT
  TO authenticated
  USING (
    "patientId" = current_setting('app.uid', true)
    OR "doctorId" IN (SELECT id FROM "Doctor" WHERE "userId" = current_setting('app.uid', true))
  );
