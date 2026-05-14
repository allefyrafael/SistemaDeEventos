'use client';

import { useAuth } from '../../../lib/auth-context';
import { CredentialLogin } from '../../../components/auth/credential-login';

/**
 * Login voluntario — CPF + senha pessoal. Voluntarios sao cadastrados
 * pelo admin do evento com escopo VOLUNTEER_STUDENTS ou
 * VOLUNTEER_COMPANIES (visto em EventMember.role contextual ao evento).
 */
export default function VolunteerLoginPage() {
  const { loginVolunteer } = useAuth();
  return (
    <CredentialLogin
      kicker="Equipe do evento"
      title="Voluntario"
      description="Voluntarios cadastrados pelo organizador acessam com CPF e a senha pessoal."
      redirectTo="/voluntario"
      helpSub="Fale com o administrador para redefini-la."
      footerLabel="EventPass · Painel do voluntario"
      doLogin={loginVolunteer}
    />
  );
}
