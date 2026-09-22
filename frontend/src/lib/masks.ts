/** Client-side masks + BR document validators (no external deps). */

export function onlyDigits(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

// ── CNPJ ────────────────────────────────────────────────────────────
export function maskCnpj(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  let out = d;
  if (d.length > 2) out = `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length > 5) out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 8)
    out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 12)
    out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(
      8,
      12,
    )}-${d.slice(12)}`;
  return out;
}

export function isValidCnpj(value: string): boolean {
  const c = onlyDigits(value);
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;
  const calc = (len: number): number => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += Number(c[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const res = sum % 11;
    return res < 2 ? 0 : 11 - res;
  };
  if (calc(12) !== Number(c[12])) return false;
  return calc(13) === Number(c[13]);
}

// ── CPF ─────────────────────────────────────────────────────────────
export function maskCpf(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  let out = d;
  if (d.length > 3) out = `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length > 6) out = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 9)
    out = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return out;
}

export function isValidCpf(value: string): boolean {
  const c = onlyDigits(value);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(c[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== Number(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(c[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === Number(c[10]);
}

// ── Phone (BR national display) ─────────────────────────────────────
export function maskPhoneBr(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    let out = d;
    if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 6) out = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return out;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ── CEP ─────────────────────────────────────────────────────────────
export function maskCep(v: string): string {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d;
}
