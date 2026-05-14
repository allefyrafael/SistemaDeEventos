'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { clsx } from 'clsx';
import { Award, X } from 'lucide-react';
import type {
  CertificateDto,
  FeedbackQuestion,
  FeedbackTemplate,
} from '@eventpass/shared';
import { api, ApiError } from '../../../lib/api';
import { useActiveEvent } from '../../../lib/use-active-event';
import { Button, ErrorBanner, SuccessBanner } from '../../../components/form';

interface PassportItem {
  stampConfigId: string;
  titulo: string;
  ordem: number;
  obrigatorio: boolean;
  obtido: boolean;
  dataConclusao: string | null;
  companyId: string | null;
  companyNome: string | null;
  feedbackRespondido: boolean;
}

interface PassportStatus {
  eventId: string;
  totalRequired: number;
  totalCompleted: number;
  completed: boolean;
  items: PassportItem[];
}

type AnswerMap = Record<string, string | number | string[]>;

export default function PassportPage() {
  const router = useRouter();
  const { event, loading: eventLoading } = useActiveEvent();
  const [status, setStatus] = useState<PassportStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  const [certErr, setCertErr] = useState<string | null>(null);

  // Estado do modal de avaliacao inline. Quando setado, abre overlay
  // com o template de feedback da empresa que carimbou o item.
  const [evaluating, setEvaluating] = useState<PassportItem | null>(null);

  async function emitirCertificado() {
    if (!event) return;
    setCertLoading(true);
    setCertErr(null);
    try {
      const cert = await api<CertificateDto>(
        `/events/${event.id}/passport/me/certificate`,
        { method: 'POST' },
      );
      router.push(`/certificado/${cert.code}` as Route);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setCertErr(msg);
    } finally {
      setCertLoading(false);
    }
  }

  async function loadStatus() {
    if (!event) return;
    setErr(null);
    try {
      const s = await api<PassportStatus>(`/events/${event.id}/passport/me/status`);
      setStatus(s);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    if (!event) return;
    void (async () => {
      setLoading(true);
      await loadStatus();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  if (eventLoading || loading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-sm">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-primary/20 border-t-brand-primary" />
        <p className="text-sm text-slate-500">Carregando passaporte...</p>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
        Voce ainda nao esta inscrito em nenhum evento.
      </div>
    );
  }
  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Nao foi possivel carregar seu passaporte: {err}
      </div>
    );
  }
  if (!status) return null;

  const progress =
    status.totalRequired === 0
      ? 0
      : Math.min(100, (status.totalCompleted / status.totalRequired) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-slate-500">Progresso</p>
          <p className="text-sm font-semibold text-slate-900">
            {status.totalCompleted}/{status.totalRequired}
          </p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={clsx(
              'h-full rounded-full transition-all',
              status.completed ? 'bg-emerald-500' : 'bg-brand-primary',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        {status.completed && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg bg-emerald-50 p-3">
            <p className="text-sm font-semibold text-emerald-800">
              Parabens! Voce concluiu todos os carimbos obrigatorios.
            </p>
            {event?.modules.includes('certificate') ? (
              <>
                <button
                  type="button"
                  onClick={() => void emitirCertificado()}
                  disabled={certLoading}
                  className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
                >
                  <Award size={16} />
                  {certLoading ? 'Emitindo certificado...' : 'Emitir certificado'}
                </button>
                {certErr && (
                  <p className="text-xs font-medium text-red-700">{certErr}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-emerald-700">
                Aguarde a organizacao habilitar o modulo de certificado para baixar.
              </p>
            )}
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {status.items.map((item, idx) => (
          <li
            key={item.stampConfigId}
            className={clsx(
              'flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm',
              item.obtido ? 'border-emerald-200' : 'border-slate-200',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={clsx(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold',
                  item.obtido
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400',
                )}
              >
                {item.obtido ? '✓' : idx + 1}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {item.titulo}
                </p>
                <p className="text-xs text-slate-500">
                  {item.obtido
                    ? `Carimbado por ${item.companyNome ?? 'empresa'}`
                    : item.obrigatorio
                      ? 'Obrigatorio'
                      : 'Opcional'}
                  {item.obtido && item.feedbackRespondido && ' · avaliado'}
                </p>
              </div>
            </div>
            {item.obtido && !item.feedbackRespondido && item.companyId && (
              <button
                type="button"
                onClick={() => setEvaluating(item)}
                className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition active:scale-[0.98]"
              >
                Avaliar
              </button>
            )}
          </li>
        ))}
      </ul>

      {evaluating && event && (
        <EvaluateModal
          eventId={event.id}
          item={evaluating}
          onClose={() => setEvaluating(null)}
          onSaved={async () => {
            setEvaluating(null);
            await loadStatus();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal inline de avaliacao da empresa que carimbou o item. Substituiu a
// tela /estudante/feedback (removida do nav). Mantemos o contrato:
//   GET  /events/:id/feedback/template?companyId=...
//   POST /events/:id/feedback/submit  { companyId, nota, respostas }
// ---------------------------------------------------------------------------

function EvaluateModal({
  eventId,
  item,
  onClose,
  onSaved,
}: {
  eventId: string;
  item: PassportItem;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [template, setTemplate] = useState<FeedbackTemplate | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!item.companyId) return;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const t = await api<FeedbackTemplate>(
          `/events/${eventId}/feedback/template?companyId=${item.companyId}`,
        );
        setTemplate(t);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : (e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId, item.companyId]);

  async function submit() {
    if (!item.companyId || !template) return;
    setSubmitting(true);
    setErr(null);
    try {
      const nota = template.questions.find((q) => q.type === 'rating');
      const notaValue =
        nota && typeof answers[nota.id] === 'number'
          ? (answers[nota.id] as number)
          : undefined;
      await api(`/events/${eventId}/feedback/submit`, {
        method: 'POST',
        body: {
          companyId: item.companyId,
          nota: notaValue,
          respostas: answers,
        },
      });
      setOk('Avaliacao registrada. Obrigado!');
      // Pequeno delay para o usuario ler o success antes do modal fechar.
      window.setTimeout(() => void onSaved(), 700);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evaluate-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Bottom sheet em mobile (cantos arredondados topo), modal centralizado em sm+ */}
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Avaliar empresa
            </p>
            <h2
              id="evaluate-modal-title"
              className="mt-0.5 truncate text-lg font-bold text-slate-900"
            >
              {item.companyNome ?? 'Empresa'}
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              Carimbo: {item.titulo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {ok && <SuccessBanner>{ok}</SuccessBanner>}
          {err && <ErrorBanner>{err}</ErrorBanner>}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-primary/20 border-t-brand-primary" />
            </div>
          ) : template ? (
            <div className="flex flex-col gap-4">
              {template.questions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                />
              ))}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || loading || !template}
          >
            {submitting ? 'Enviando...' : 'Enviar avaliacao'}
          </Button>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Renderiza cada tipo de pergunta. Logica equivalente ao que existia na
// rota /estudante/feedback (que continua existindo como deep link).
// ---------------------------------------------------------------------------

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
    <div className="rounded-lg bg-slate-50 p-4">
      <label className="block text-sm font-semibold text-slate-800">
        {question.label}
        {question.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <div className="mt-3">
        {question.type === 'rating' && (
          <div className="flex flex-wrap gap-2">
            {Array.from(
              { length: question.max - question.min + 1 },
              (_, i) => question.min + i,
            ).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={clsx(
                  'flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold transition',
                  value === n
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand-primary',
                )}
              >
                {n}
              </button>
            ))}
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
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-primary',
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
                    onChange(
                      active ? arr.filter((x) => x !== opt) : [...arr, opt],
                    )
                  }
                  className={clsx(
                    'rounded-lg border px-4 py-2 text-left text-sm transition',
                    active
                      ? 'border-brand-primary bg-brand-primary/10 font-semibold text-brand-primary'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-primary',
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
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
