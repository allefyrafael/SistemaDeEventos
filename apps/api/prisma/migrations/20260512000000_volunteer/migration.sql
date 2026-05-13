-- Adiciona o perfil Voluntario ao sistema:
-- - UserType.VOLUNTEER: novo tipo de usuario com login pessoal (CPF + senha)
-- - EventMemberRole.VOLUNTEER_STUDENTS e VOLUNTEER_COMPANIES: escopo
--   contextual por evento (uma mesma pessoa pode atuar como voluntaria
--   de estudantes em um evento e de empresas em outro).
ALTER TYPE "UserType" ADD VALUE 'VOLUNTEER';

ALTER TYPE "EventMemberRole" ADD VALUE 'VOLUNTEER_STUDENTS';
ALTER TYPE "EventMemberRole" ADD VALUE 'VOLUNTEER_COMPANIES';
