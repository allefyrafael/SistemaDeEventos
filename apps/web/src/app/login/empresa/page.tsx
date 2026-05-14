'use client';

import { useAuth } from '../../../lib/auth-context';
import { CredentialLogin } from '../../../components/auth/credential-login';

/**
 * Login empresa — CPF do responsavel + senha pessoal (cada responsavel
 * tem sua propria senha, bcrypt). Antes era login por 2 CPFs (legado).
 */
export default function CompanyLoginPage() {
  const { loginCompany } = useAuth();
  return (
    <CredentialLogin
      kicker="Acesso do recrutador"
      title="Empresa"
      description="O responsavel cadastrado pelo administrador entra com seu CPF e a senha pessoal."
      cpfLabel="CPF do responsavel"
      redirectTo="/empresa"
      helpSub="Procure o administrador do evento para redefini-la."
      footerLabel="EventPass · Painel da empresa"
      doLogin={loginCompany}
    />
  );
}
