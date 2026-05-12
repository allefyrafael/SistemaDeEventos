'use client';

import { use, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { CertificateDto } from '@eventpass/shared';
import { api, ApiError } from '../../../lib/api';

/**
 * Pagina publica do certificado de conclusao. Acessivel a qualquer pessoa
 * com o codigo. Tres papeis:
 *
 * 1. Pagina de validacao — confirma autenticidade quando alguem escaneia
 *    o QR ou abre o link compartilhado.
 * 2. Visualizacao do certificado — layout pronto pra impressao (CSS
 *    @media print esconde o chrome). O proprio aluno acessa esta pagina
 *    e clica "Imprimir / Salvar PDF" pra ter o arquivo.
 * 3. Folha A4 com QR no canto pra terceiros validarem.
 */
export default function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [cert, setCert] = useState<CertificateDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api<CertificateDto>(`/certificates/${encodeURIComponent(code)}`);
        setCert(data);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : (e as Error).message;
        setErr(msg);
      }
    })();
  }, [code]);

  // Renderiza o QR (aponta pra essa mesma URL — quem escanear chega aqui de novo)
  useEffect(() => {
    if (!cert || !qrCanvasRef.current) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    void QRCode.toCanvas(qrCanvasRef.current, url, {
      width: 140,
      margin: 1,
      color: { dark: '#0F172A', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
  }, [cert]);

  if (err) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-bold text-red-700">Certificado nao encontrado</h1>
        <p className="text-sm text-slate-600">{err}</p>
        <p className="text-xs text-slate-500">
          Verifique o codigo digitado ou peca para o emissor compartilhar o link
          novamente.
        </p>
      </main>
    );
  }

  if (!cert) {
    return (
      <main className="mx-auto flex min-h-dvh items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-primary/20 border-t-brand-primary" />
          Validando certificado...
        </div>
      </main>
    );
  }

  const inicio = new Date(cert.eventStartsAt);
  const fim = new Date(cert.eventEndsAt);
  const emitidoEm = new Date(cert.generatedAt);
  const mesmoDia =
    inicio.toDateString() === fim.toDateString();
  const dataEvento = mesmoDia
    ? inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : `${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} a ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`;

  return (
    <main className="min-h-dvh bg-slate-100 p-4 sm:p-8 print:bg-white print:p-0">
      {/* Toolbar (escondida na impressao) */}
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 print:hidden">
        <p className="text-xs text-slate-500">
          Codigo:{' '}
          <span className="font-mono font-semibold text-slate-700">{cert.code}</span>
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Folha do certificado (estilo A4 paisagem) */}
      <section className="relative mx-auto flex aspect-[1.414/1] max-w-3xl flex-col items-center justify-between rounded-2xl border-2 border-brand-primary/20 bg-white p-8 shadow-xl sm:p-12 print:border-0 print:shadow-none">
        {/* Selo decorativo top-left */}
        <div className="pointer-events-none absolute -left-3 -top-3 h-24 w-24 rounded-full bg-brand-primary/10 blur-xl" />

        <header className="relative w-full text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-slate-400">
            Certificado de participacao
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold italic text-brand-primary sm:text-4xl">
            {cert.eventNome}
          </h1>
          <p className="mt-1 text-xs text-slate-500">{dataEvento}</p>
        </header>

        <div className="relative flex w-full flex-col items-center gap-3 text-center">
          <p className="text-sm text-slate-600">Certificamos que</p>
          <p className="font-display text-2xl font-semibold italic text-slate-900 sm:text-3xl">
            {cert.studentNome}
          </p>
          {cert.studentMatricula && (
            <p className="text-xs text-slate-500">
              Matricula <span className="font-mono">{cert.studentMatricula}</span>
            </p>
          )}
          <p className="max-w-xl text-sm text-slate-600 sm:text-base">
            concluiu integralmente o passaporte de visitas do evento, completando{' '}
            <strong className="text-slate-800">
              {cert.totalCompleted}/{cert.totalRequired}
            </strong>{' '}
            carimbos obrigatorios com avaliacao de cada empresa visitada.
          </p>
        </div>

        <footer className="relative grid w-full grid-cols-[1fr_auto] items-end gap-4 text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-700">EventPass</p>
            <p>Emitido em {emitidoEm.toLocaleDateString('pt-BR')}</p>
            <p className="mt-1 text-[10px] text-slate-400">
              Validacao: <span className="font-mono">{cert.code}</span>
            </p>
            <p className="text-[10px] text-slate-400">
              Tipo de participante:{' '}
              {cert.studentTipo === 'INTERNAL' ? 'Estudante' : 'Visitante externo'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <canvas ref={qrCanvasRef} className="rounded-md border border-slate-200" />
            <p className="text-[9px] uppercase tracking-wider text-slate-400">
              Escaneie para validar
            </p>
          </div>
        </footer>
      </section>

      {/* Bloco de instrucoes (escondido na impressao) */}
      <aside className="mx-auto mt-6 max-w-3xl rounded-xl bg-white p-5 text-sm shadow-sm print:hidden">
        <p className="font-semibold text-slate-800">Sobre este certificado</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
          <li>
            A pagina serve tanto como o proprio certificado quanto como pagina
            de validacao. Qualquer pessoa com o link ou o QR pode confirmar a
            autenticidade.
          </li>
          <li>
            Use o botao <strong>Imprimir / Salvar PDF</strong> acima para gerar
            o arquivo final. No dialogo de impressao escolha &quot;Salvar como
            PDF&quot; (Chrome / Edge / Safari).
          </li>
          <li>
            Codigo de validacao:{' '}
            <span className="font-mono font-semibold">{cert.code}</span>
          </li>
        </ul>
      </aside>

      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>
    </main>
  );
}
