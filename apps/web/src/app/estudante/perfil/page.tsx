'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { maskCpf } from '../../../lib/format';
import {
  Button,
  ErrorBanner,
  Field,
  SuccessBanner,
  TextInput,
} from '../../../components/form';

interface Profile {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  matricula: string | null;
  studentKind: 'INTERNAL' | 'EXTERNAL';
  linkedinUrl: string | null;
  curriculoKey: string | null;
}

export default function StudentProfilePage() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [linkedin, setLinkedin] = useState('');
  const [curriculo, setCurriculo] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const p = await api<Profile>('/me/profile');
        setProfile(p);
        setLinkedin(p.linkedinUrl ?? '');
        setCurriculo(p.curriculoKey ?? '');
      } catch (e) {
        setLoadError((e as Error).message);
      }
    })();
  }, []);

  async function save() {
    setErr(null);
    setOk(null);
    setSaving(true);
    try {
      const updated = await api<Profile>('/me/profile', {
        method: 'PATCH',
        body: {
          linkedinUrl: linkedin.trim() || null,
          curriculoKey: curriculo.trim() || null,
        },
      });
      setProfile((p) => (p ? { ...p, ...updated } : p));
      setOk('Perfil atualizado');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Nao foi possivel carregar seu perfil: {loadError}
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-sm">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-primary/20 border-t-brand-primary" />
        <p className="text-sm text-slate-500">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Dados de cadastro</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">{profile.nome}</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600">
          <div className="flex justify-between">
            <dt>Email</dt>
            <dd className="font-medium text-slate-800">{profile.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt>CPF</dt>
            <dd className="font-medium text-slate-800">{maskCpf(profile.cpf)}</dd>
          </div>
          {profile.matricula && (
            <div className="flex justify-between">
              <dt>Matricula</dt>
              <dd className="font-medium text-slate-800">{profile.matricula}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Tipo</dt>
            <dd className="font-medium text-slate-800">
              {profile.studentKind === 'INTERNAL' ? 'Estudante' : 'Visitante externo'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Networking</p>
        <p className="mt-1 text-sm text-slate-600">
          Adicione seus links para facilitar o contato com recrutadores.
        </p>
        {err && <div className="mt-3"><ErrorBanner>{err}</ErrorBanner></div>}
        {ok && <div className="mt-3"><SuccessBanner>{ok}</SuccessBanner></div>}
        <div className="mt-4 flex flex-col gap-3">
          <Field label="LinkedIn" hint="Cole a URL completa do seu perfil">
            <TextInput
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://www.linkedin.com/in/seu-perfil"
              inputMode="url"
              pattern="https?://.*"
            />
          </Field>
          <Field label="Curriculo (URL)" hint="Opcional - pode ser um link Drive/Dropbox">
            <TextInput
              type="url"
              value={curriculo}
              onChange={(e) => setCurriculo(e.target.value)}
              placeholder="https://..."
              inputMode="url"
              pattern="https?://.*"
            />
          </Field>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar perfil'}
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void logout()}
        className="mt-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 shadow-sm active:bg-red-50"
      >
        Sair da conta
      </button>
    </div>
  );
}
