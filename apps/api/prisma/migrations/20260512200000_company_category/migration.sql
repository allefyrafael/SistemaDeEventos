-- Categorias de empresa por evento + atalho de autorizacao por categoria
-- nos stamps. Coexiste com a tabela junção StampConfigCompany (N:M
-- empresas por stamp); categoria libera TODAS as empresas dela.

CREATE TABLE "company_categories" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "color" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_categories_eventId_nome_key"
    ON "company_categories"("eventId", "nome");

CREATE INDEX "company_categories_eventId_ordem_idx"
    ON "company_categories"("eventId", "ordem");

ALTER TABLE "company_categories" ADD CONSTRAINT "company_categories_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Adiciona Company.categoryId (FK opcional, SET NULL ao deletar a categoria).
ALTER TABLE "companies" ADD COLUMN "categoryId" TEXT;
CREATE INDEX "companies_categoryId_idx" ON "companies"("categoryId");
ALTER TABLE "companies" ADD CONSTRAINT "companies_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "company_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Adiciona StampConfig.companyCategoryId (atalho de autorizacao em massa).
ALTER TABLE "stamp_configs" ADD COLUMN "companyCategoryId" TEXT;
CREATE INDEX "stamp_configs_companyCategoryId_idx" ON "stamp_configs"("companyCategoryId");
ALTER TABLE "stamp_configs" ADD CONSTRAINT "stamp_configs_companyCategoryId_fkey"
    FOREIGN KEY ("companyCategoryId") REFERENCES "company_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
