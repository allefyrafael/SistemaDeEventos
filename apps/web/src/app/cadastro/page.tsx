'use client';

import Link from 'next/link';
import { GraduationCap, UserPlus } from 'lucide-react';
import { AuthShell, AuthKicker, AuthHero } from '../../components/auth/auth-shell';
import { ChoiceCard } from '../../components/auth/choice-card';

/**
 * Triagem de cadastro publica — porta direta do signup-screen.jsx do
 * design Editorial. Pergunta: voce e estudante institucional (com
 * matricula UC########) ou visitante externo (sem vinculo, so CPF +
 * senha)? Cada card leva pra rota especifica de cadastro.
 */
export default function CadastroTriagePage() {
  return (
    <AuthShell backHref="/">
      {/* HERO */}
      <div className="mt-1">
        <AuthKicker>Novo por aqui</AuthKicker>
        <AuthHero
          lineA="Criar"
          lineB="conta."
          size="lg"
          description="Voce e estudante da instituicao organizadora ou visitante externo?"
        />
      </div>

      {/* CHOICE CARDS */}
      <div className="mt-6 flex flex-col gap-3">
        <ChoiceCard
          href="/cadastro/estudante"
          variant="primary"
          badge="Recomendado"
          icon={<GraduationCap size={22} strokeWidth={1.6} />}
          title="Sou estudante"
          desc="Tenho matricula institucional no padrao"
          highlight="UC + 8 digitos"
          example="(ex: UC24101130)"
          bullets={[
            'Acesso ao catalogo de vagas',
            'Passaporte digital com QR',
            'Salvar curriculo e LinkedIn',
          ]}
        />
        <ChoiceCard
          href="/cadastro/visitante"
          variant="outlined"
          icon={<UserPlus size={22} strokeWidth={1.6} />}
          title="Sou visitante externo"
          desc="Nao tenho vinculo institucional, mas vou participar do evento."
          bullets={[
            'Cadastro com email e CPF',
            'Acesso aos stands do evento',
            'Recebe credencial digital',
          ]}
        />
      </div>

      <div className="flex-1" />

      {/* FOOTER */}
      <p className="border-t border-black/10 pt-4 text-center text-[13px] text-[#3A4664]">
        Ja tem cadastro?{' '}
        <Link
          href="/login/estudante"
          className="font-semibold text-[#1E46B0] hover:underline"
        >
          Fazer login
        </Link>
      </p>
    </AuthShell>
  );
}
