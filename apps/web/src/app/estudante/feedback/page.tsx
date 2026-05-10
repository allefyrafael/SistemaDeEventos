'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { clsx } from 'clsx';
import type { FeedbackQuestion, FeedbackTemplate } from '@eventpass/shared';
import { api } from '../../../lib/api';
import { useActiveEvent } from '../../../lib/use-active-event';
import { Button, ErrorBanner, SuccessBanner } from '../../../components/form';

interface Pending {
  companyId: string;
  nome: string;
}

type AnswerMap = Record<string, string | number | string[]>;

/**
 * Componente raiz envolve o conteúdo em Suspense para satisfazer o Next.js 15,
 * que exige Suspense boundary acima de qualquer componente que chame useSearchParams().
 */
export default function FeedbackPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Carregando...</p>}>
      <FeedbackContent />
    </Suspense>
  );
}

function FeedbackContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const preselect = sp.get('company');
  const { event } = useActiveEvent();
  const [pendentes, setPendentes] = useState<Pending[] | null>(null);
  const [selected, setSelected] = useState<Pending | null>(null);
  const [template, setTemplate] = useState<FeedbackTemplate | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!event) return;
    void (async () => {
      const rows = await api<Pending[]>(`/events/${event.id}/feedback/me/pending`);
      setPendentes(rows);
      if (preselect) {
        const chosen = rows.find((r) => r.companyId === preselect);
        if (chosen) setSelected(chosen);
      }
    })();
  }, [event, preselect]);

  useEffect(() => {
    if (!event || !selected) return;
    setTemplate(null);
    setAnswers({});
    void (async () => {
      const t = await api<FeedbackTemplate>(
        `/events/${event.id}/feedback/template?companyId=${selected.companyId}`,
      );
      setTemplate(t);
    })();
  }, [event, selected]);

  async function submit() {
    if (!event || !selected || !template) return;
    setErr(null);
    setOk(null);
    setSubmitting(true);
    try {
      const nota = template.questions.find((q) => q.type === 'rating');
      const notaValue =
        nota && typeof answers[nota.id] === 'number' ? (answers[nota.id] as number) : undefined;
      await api(`/events/${event.id}/feedback/submit`, {
        method: 'POST',
        body: {
          companyId: selected.companyId,
          nota: notaValue,
          respostas: answers,
        },
      });
      setOk('Obrigado! Feedback registrado.');
      setPendentes((p) => p?.filter((x) => x.companyId !== selected.companyId) ?? null);
      setSelected(null);
      setTemplate(null);
      setTimeout(() => router.push('/estudante/passaporte'), 800);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!pendentes) return <p className="text-slate-500">Carregando...</p>;
  if (pendentes.length === 0 && !selected) {
    return (
      <div className="rounded-lg bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-600">Voce nao tem feedbacks pendentes.</p>
          <Link
          href={'/estudante/passaporte' as Route}
          className="mt-3 inline-block text-sm font-semibold text-brand-primary"
        >
          Ver meu passaporte →
        </Link>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-600">
          Avalie as empresas que voce visitou para completar seu passaporte.
        </p>
        {pendentes.map((p) => (
          <button
            key={p.companyId}
            type="button"
            onClick={() => setSelected(p)}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50"
          >
            <span className="font-semibold text-slate-900">{p.nome}</span>
            <span className="text-sm text-brand-primary">Avaliar →</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setSelected(null)}
        className="self-start text-xs text-slate-500"
      >
        ← Voltar
      </button>
      <h2 className="text-lg font-bold text-slate-900">Avaliar {selected.nome}</h2>
      {err && <ErrorBanner>{err}</ErrorBanner>}
      {ok && <SuccessBanner>{ok}</SuccessBanner>}

      {template ? (
        <div className="flex flex-col gap-4">
          {template.questions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
            />
          ))}
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar feedback'}
          </Button>
        </div>
      ) : (
        <p className="text-slate-500">Carregando perguntas...</p>
      )}
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: FeedbackQuestion;
  value: string | number | string[] | undefined;
  onChange: (v: string | number | string[]) => void;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <label className="block text-sm font-semibold text-slate-800">
        {question.label}
        {question.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <div className="mt-3">
        {question.type === 'rating' && (
          <div className="flex gap-2">
            {Array.from({ length: question.max - question.min + 1 }, (_, i) => question.min + i).map(
              (n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className={clsx(
                    'flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold transition',
                    value === n
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-slate-200 bg-white text-slate-600',
                  )}
                >
                  {n}
                </button>
              ),
            )}
          </div>
        )}
        {question.type === 'single' && (
          <div className="flex flex-col gap-2">
            {question.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={clsx(
                  'rounded-lg border px-4 py-2 text-left text-sm transition',
                  value === opt
                    ? 'border-brand-primary bg-brand-primary/10 font-semibold text-brand-primary'
                    : 'border-slate-200 bg-white text-slate-700',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
        {question.type === 'multi' && (
          <div className="flex flex-col gap-2">
            {question.options.map((opt) => {
              const arr = Array.isArray(value) ? value : [];
              const active = arr.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    onChange(active ? arr.filter((x) => x !== opt) : [...arr, opt])
                  }
                  className={clsx(
                    'rounded-lg border px-4 py-2 text-left text-sm transition',
                    active
                      ? 'border-brand-primary bg-brand-primary/10 font-semibold text-brand-primary'
                      : 'border-slate-200 bg-white text-slate-700',
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}
        {question.type === 'text' && (
          <textarea
            maxLength={question.maxLength}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
