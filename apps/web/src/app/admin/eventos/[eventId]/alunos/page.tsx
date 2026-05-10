'use client';

import { useEffect, useRef, useState } from 'react';
import type { StudentImportResult } from '@eventpass/shared';
import { api } from '../../../../../lib/api';
import { useEventFromParams } from '../../../../../lib/use-event-from-params';
import {
  Button,
  ErrorBanner,
  SuccessBanner,
  TextInput,
} from '../../../../../components/form';

interface Student {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  matricula: string | null;
  studentKind: 'INTERNAL' | 'EXTERNAL';
  linkedinUrl: string | null;
}

export default function EventStudentsPage() {
  const { event } = useEventFromParams();
  const [rows, setRows] = useState<Student[] | null>(null);
  const [filter, setFilter] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<StudentImportResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!event) return;
    const data = await api<Student[]>(`/events/${event.id}/students`);
    setRows(data);
  }

  useEffect(() => {
    void load();
  }, [event]);

  async function handleFile(file: File) {
    if (!event) return;
    setErr(null);
    setResult(null);
    setImporting(true);
    try {
      const text = await file.text();
      const r = await api<StudentImportResult>(
        `/events/${event.id}/students/import`,
        { method: 'POST', body: { csv: text } },
      );
      setResult(r);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (!event) return null;

  const filtered = rows?.filter((r) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      r.nome.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.matricula ?? '').includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Participantes</h2>
          <p className="text-sm text-slate-500">
            Importe participantes em massa via CSV ou deixe-os se auto-cadastrar como externos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? 'Importando...' : 'Importar CSV'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
        <p className="font-semibold text-slate-800">Formato do CSV</p>
        <p>
          Cabecalho: <code className="rounded bg-slate-100 px-1">matricula,nome,cpf,email</code> —
          separador virgula, codificacao UTF-8. O CPF aceita formato com ou sem pontuacao.
        </p>
      </div>

      {err && <ErrorBanner>{err}</ErrorBanner>}
      {result && (
        <SuccessBanner>
          <span>
            {result.criados} criados, {result.atualizados} atualizados,{' '}
            {result.ignorados} ignorados em {result.totalLinhas} linhas.
            {result.erros.length > 0 && ` · ${result.erros.length} erro(s).`}
          </span>
        </SuccessBanner>
      )}
      {result && result.erros.length > 0 && (
        <details className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-amber-900">
            Ver erros da importacao
          </summary>
          <ul className="mt-2 text-xs text-amber-900">
            {result.erros.slice(0, 50).map((er, i) => (
              <li key={i}>
                Linha {er.linha}: {er.mensagem}
              </li>
            ))}
          </ul>
        </details>
      )}

      <TextInput
        placeholder="Buscar por nome, email ou matricula"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {!filtered ? (
        <p className="text-slate-500">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500">Nenhum participante encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Matricula</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">LinkedIn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{s.nome}</td>
                  <td className="px-4 py-2 text-slate-700">{s.matricula ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-700">{s.email}</td>
                  <td className="px-4 py-2 text-slate-700">
                    {s.studentKind === 'INTERNAL' ? 'Estudante' : 'Externo'}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {s.linkedinUrl ? (
                      <a
                        href={s.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-primary"
                      >
                        perfil
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
