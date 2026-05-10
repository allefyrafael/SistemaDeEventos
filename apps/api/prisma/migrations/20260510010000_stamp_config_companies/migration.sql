-- Tabela junção N:M de empresas autorizadas a carimbar um stamp.
-- Substitui o relacionamento 1:1 do campo legado StampConfig.entidadeAutorizadaId.
CREATE TABLE "stamp_config_companies" (
    "stampConfigId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stamp_config_companies_pkey" PRIMARY KEY ("stampConfigId", "companyId")
);

CREATE INDEX "stamp_config_companies_companyId_idx" ON "stamp_config_companies"("companyId");

ALTER TABLE "stamp_config_companies" ADD CONSTRAINT "stamp_config_companies_stampConfigId_fkey"
    FOREIGN KEY ("stampConfigId") REFERENCES "stamp_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stamp_config_companies" ADD CONSTRAINT "stamp_config_companies_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migra dados existentes: cada stamp com entidadeAutorizadaId definido vira
-- 1 registro na tabela junção (preserva a regra atual). O campo legado e
-- mantido no schema apenas como compatibilidade historica.
INSERT INTO "stamp_config_companies" ("stampConfigId", "companyId")
SELECT id, "entidadeAutorizadaId" FROM "stamp_configs"
WHERE "entidadeAutorizadaId" IS NOT NULL;
