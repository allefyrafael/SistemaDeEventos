/**
 * CSV parser minimalista para o import de alunos (RF01).
 * Suporta separadores , ou ; e valores entre aspas duplas com escape "".
 * Substituivel por um pacote mais robusto (ex: papaparse) se necessario.
 */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  const text = content.replace(/\r\n?/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',' || ch === ';') {
      current.push(field);
      field = '';
    } else if (ch === '\n') {
      current.push(field);
      rows.push(current);
      current = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export interface CsvHeaderMap {
  matricula: number;
  nome: number;
  cpf: number;
  email: number;
}

export function detectHeaders(firstRow: string[]): CsvHeaderMap {
  const norm = firstRow.map((c) =>
    c
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
  );
  const find = (...candidates: string[]) =>
    norm.findIndex((c) => candidates.includes(c));

  const map: CsvHeaderMap = {
    matricula: find('matricula', 'matric', 'ra'),
    nome: find('nome', 'nome completo', 'aluno'),
    cpf: find('cpf', 'documento'),
    email: find('email', 'e-mail', 'email institucional'),
  };
  (Object.keys(map) as (keyof CsvHeaderMap)[]).forEach((k) => {
    if (map[k] < 0) {
      throw new Error(`Coluna obrigatoria nao encontrada: ${k}`);
    }
  });
  return map;
}
