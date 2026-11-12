/**
 * Ubah "YYYY-MM-DDTHH:mm" (waktu lokal browser dari <input type="datetime-local">)
 * menjadi Date yang benar. `tzOffsetRaw` = Date.getTimezoneOffset() dari browser
 * (menit, UTC - lokal), sehingga hasilnya tidak bergantung pada zona waktu server.
 */
export function parseLocalDateTime(local: string, tzOffsetRaw: FormDataEntryValue | null): Date | null {
  const offset = Number(typeof tzOffsetRaw === "string" ? tzOffsetRaw : 0);
  const safeOffset = Number.isFinite(offset) && Math.abs(offset) <= 14 * 60 ? offset : 0;
  const asUtc = new Date(`${local}:00Z`);
  if (Number.isNaN(asUtc.getTime())) return null;
  return new Date(asUtc.getTime() + safeOffset * 60_000);
}
