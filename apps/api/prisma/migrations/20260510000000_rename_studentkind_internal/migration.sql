-- Renomeia o valor do enum StudentKind de 'UCB' para 'INTERNAL'.
-- Motivacao: rebrand da plataforma para EventPass; o enum agora reflete
-- a semantica generica "estudante interno da instituicao organizadora".
ALTER TYPE "StudentKind" RENAME VALUE 'UCB' TO 'INTERNAL';
