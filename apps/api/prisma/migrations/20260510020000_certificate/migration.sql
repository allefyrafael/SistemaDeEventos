-- Tabela de certificados emitidos para participantes que concluiram
-- 100% dos itens obrigatorios do passaporte (modulo "certificate").
-- Acesso publico via `code` curto — qualquer um com o codigo pode validar.
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");
CREATE UNIQUE INDEX "certificates_eventId_studentId_key" ON "certificates"("eventId", "studentId");
CREATE INDEX "certificates_generatedAt_idx" ON "certificates"("generatedAt");

ALTER TABLE "certificates" ADD CONSTRAINT "certificates_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "certificates" ADD CONSTRAINT "certificates_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
