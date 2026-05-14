'use client';

import { useAuth } from '../../../lib/auth-context';
import { CredentialLogin } from '../../../components/auth/credential-login';

/**
 * Login administrador — CPF + senha pessoal. Visual identico aos outros
 * logins por credencial; variam so os textos (kicker, descricao, footer).
 */
export default function AdminLoginPage() {
  const { loginAdmin } = useAuth();
  return (
    <CredentialLogin
      kicker="Painel de gestao"
      title="Administrador"
      description="Acesso restrito ao organizador do evento. Use o CPF e a senha cadastrados."
      redirectTo="/admin"
      footerLabel="EventPass · Acesso administrativo"
      doLogin={loginAdmin}
    />
  );
}
