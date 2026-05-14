'use client';

import type { ReactNode } from 'react';

/**
 * Banner de erro discreto, alinhado ao design Editorial (red on red-bg
 * suave, radius 14 igual aos campos). Usado nas telas auth quando o
 * backend retorna falha. Sem icone — texto basta.
 */
export function AuthErrorBanner({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-[14px] border border-[#C8344F]/30 bg-[#C8344F]/[0.08] px-4 py-3 text-[12.5px] font-medium leading-snug text-[#9C2540]"
    >
      {children}
    </div>
  );
}
