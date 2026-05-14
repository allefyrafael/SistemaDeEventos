'use client';

import { useEffect, useState } from 'react';
import type { CompanyCategoryDto, CompanyDto } from '@eventpass/shared';
import { api } from '../../../../../lib/api';
import { useEventFromParams } from '../../../../../lib/use-event-from-params';
import { useConfirm } from '../../../../../components/confirm-modal';
import {
  Button,
  ErrorBanner,
  Field,
  SuccessBanner,
  TextInput,
} from '../../../../../components/form';

interface Responsavel {
  /** Id do User quando o responsavel ja existe (vindo de initial). */
  id?: string;
  nome: string;
  cpf: string;
  email?: string;
  /** Senha pessoal usada no login. Opcional ao editar — se vazia mantem a anterior. */
  senha?: string;
}

export default function EventCompaniesPage() {
  const { event } = useEventFromParams();
  const confirm = useConfirm();
  const [rows, setRows] = useState<CompanyDto[] | null>(null);
  const [categories, setCategories] = useState<CompanyCategoryDto[]>([]);
  const [editing, setEditing] = useState<CompanyDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!event) return;
    const [data, cats] = await Promise.all([
      api<CompanyDto[]>(`/events/${event.id}/companies`),
      api<CompanyCategoryDto[]>(`/events/${event.id}/company-categories`),
    ]);
    setRows(data);
    setCategories(cats);
  }

  useEffect(() => {
    void load();
  }, [event]);

  async function remove(c: CompanyDto) {
    if (!event) return;
    const respsCount = c.responsaveis.length;
    const carimbos = c.metricas?.totalCarimbos ?? 0;
    const linhas: string[] = [];
    if (respsCount > 0) {
      linhas.push(`${respsCount} responsavel(eis) perdera(o) acesso de empresa neste evento.`);
    }
    if (carimbos > 0) {
      linhas.push(
        `Esta empresa ja concedeu ${carimbos} carimbo(s) — eles ficam no historico mas perdem o vinculo com a empresa.`,
      );
    }
    linhas.push('Esta acao nao pode ser desfeita.');
    const okAnswer = await confirm({
      title: `Excluir "${c.nome}"?`,
      message: linhas.join('\n\n'),
      confirmLabel: 'Excluir empresa',
    });
    if (!okAnswer) return;
    try {
      await api(`/events/${event.id}/companies/${c.id}`, { method: 'DELETE' });
      setOk(`Empresa "${c.nome}" excluida.`);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!event) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Empresas</h2>
          <p className="text-sm text-slate-500">
            Expositores deste evento. Cada responsavel cadastrado pode entrar em /login/empresa
            com o CPF cadastrado.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nova empresa</Button>
      </div>

      {ok && <SuccessBanner>{ok}</SuccessBanner>}
      {err && <ErrorBanner>{err}</ErrorBanner>}

      {creating && (
        <CompanyForm
          eventId={event.id}
          categories={categories}
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setOk('Empresa criada');
            void load();
          }}
        />
      )}
      {editing && (
        <CompanyForm
          eventId={event.id}
          initial={editing}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setOk('Empresa atualizada');
            void load();
          }}
        />
      )}

      {!rows ? (
        <p className="text-slate-500">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">Nenhuma empresa cadastrada neste evento.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Stand</th>
                  <th className="px-4 py-3">Responsaveis</th>
                  <th className="px-4 py-3">Metricas</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c.id} className={!c.ativo ? 'opacity-50' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{c.nome}</p>
                      <p className="text-xs text-slate-500">/{c.slug}</p>
                      {c.category && (
                        <span
                          className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{ background: c.category.color ?? '#64748B' }}
                        >
                          {c.category.nome}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.stand ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {c.responsaveis.map((r) => r.nome).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {c.metricas ? (
                        <>
                          {c.metricas.totalCarimbos} carimbos
                          {c.metricas.notaMedia !== null && (
                            <> · ★ {c.metricas.notaMedia.toFixed(1)}</>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="mr-2 text-xs font-medium text-brand-primary"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(c)}
                        className="text-xs font-medium text-red-600"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards em mobile (<md). */}
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((c) => (
              <li
                key={c.id}
                className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${!c.ativo ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{c.nome}</p>
                    <p className="text-xs text-slate-500">
                      /{c.slug}
                      {c.stand ? ` · stand ${c.stand}` : ''}
                    </p>
                    {c.category && (
                      <span
                        className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                        style={{ background: c.category.color ?? '#64748B' }}
                      >
                        {c.category.nome}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-3 text-xs font-medium">
                    <button type="button" onClick={() => setEditing(c)} className="text-brand-primary">
                      Editar
                    </button>
                    <button type="button" onClick={() => void remove(c)} className="text-red-600">
                      Excluir
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Resp:</span>{' '}
                  {c.responsaveis.map((r) => r.nome).join(', ') || '—'}
                </p>
                {c.metricas && (
                  <p className="mt-1 text-xs text-slate-600">
                    {c.metricas.totalCarimbos} carimbos
                    {c.metricas.notaMedia !== null && (
                      <> · ★ {c.metricas.notaMedia.toFixed(1)}</>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CompanyForm({
  eventId,
  initial,
  categories,
  onSaved,
  onCancel,
}: {
  eventId: string;
  initial?: CompanyDto;
  categories: CompanyCategoryDto[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [stand, setStand] = useState(initial?.stand ?? '');
  const [descricao, setDescricao] = useState(initial?.descricao ?? '');
  const [categoryId, setCategoryId] = useState<string>(initial?.category?.id ?? '');
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>(
    initial
      ? initial.responsaveis.map((r) => ({
          id: r.id,
          nome: r.nome,
          cpf: r.cpf,
          email: r.email ?? undefined,
        }))
      : [{ nome: '', cpf: '', email: '', senha: '' }],
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function updateResp(i: number, patch: Partial<Responsavel>) {
    setResponsaveis((arr) => arr.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit() {
    setErr(null);
    setSaving(true);
    try {
      const payload = {
        nome,
        stand: stand || undefined,
        descricao: descricao || undefined,
        categoryId: categoryId || null,
        responsaveis: responsaveis.map((r) => ({
          nome: r.nome,
          cpf: r.cpf,
          email: r.email || undefined,
          // Backend so atualiza a senha quando o admin envia um valor;
          // ao editar, deixar em branco preserva a senha anterior.
          senha: r.senha && r.senha.length >= 8 ? r.senha : undefined,
        })),
      };
      if (initial) {
        await api(`/events/${eventId}/companies/${initial.id}`, {
          method: 'PATCH',
          body: payload,
        });
      } else {
        await api(`/events/${eventId}/companies`, {
          method: 'POST',
          body: payload,
        });
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">
        {initial ? 'Editar empresa' : 'Nova empresa'}
      </h3>
      {err && <div className="mt-3"><ErrorBanner>{err}</ErrorBanner></div>}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Nome">
          <TextInput value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <Field label="Stand (opcional)">
          <TextInput value={stand ?? ''} onChange={(e) => setStand(e.target.value)} />
        </Field>
        <Field
          label="Categoria (opcional)"
          hint={
            categories.length === 0
              ? 'Cadastre categorias na aba Categorias.'
              : 'Agrupa visualmente e libera carimbos em massa via stamp.'
          }
        >
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base focus:border-brand-primary focus:outline-none"
            disabled={categories.length === 0}
          >
            <option value="">— Sem categoria —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>
        <div /> {/* coluna vazia pra alinhar grid em md */}
        <div className="md:col-span-2">
          <Field label="Descricao">
            <textarea
              value={descricao ?? ''}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </Field>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-800">Responsaveis</p>
        <p className="text-xs text-slate-500">
          Cada responsavel acessa com seu CPF + senha pessoal. Em novos
          responsaveis a senha e obrigatoria; ao editar, deixe em branco
          para preservar a senha atual.
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {responsaveis.map((r, i) => (
            <div
              key={r.id ?? `new-${i}`}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3"
            >
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                <TextInput
                  placeholder="Nome"
                  value={r.nome}
                  onChange={(e) => updateResp(i, { nome: e.target.value })}
                />
                <TextInput
                  placeholder="CPF (so numeros)"
                  value={r.cpf}
                  onChange={(e) => updateResp(i, { cpf: e.target.value })}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() =>
                    setResponsaveis((arr) =>
                      arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i),
                    )
                  }
                  className="self-stretch text-xs text-red-600 md:self-center"
                >
                  Remover
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <TextInput
                  placeholder="Email (opcional)"
                  type="email"
                  value={r.email ?? ''}
                  onChange={(e) => updateResp(i, { email: e.target.value })}
                />
                <TextInput
                  placeholder={r.id ? 'Nova senha (deixe vazio para manter)' : 'Senha (min 8 caracteres)'}
                  type="password"
                  value={r.senha ?? ''}
                  onChange={(e) => updateResp(i, { senha: e.target.value })}
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setResponsaveis((arr) => [...arr, { nome: '', cpf: '', email: '', senha: '' }])
          }
          className="mt-2 text-sm font-medium text-brand-primary"
        >
          + Adicionar responsavel
        </button>
      </div>

      <div className="mt-5 flex gap-2">
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
