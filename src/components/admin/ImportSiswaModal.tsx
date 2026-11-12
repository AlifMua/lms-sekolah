"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Download, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { Modal } from "@/components/admin/dialogs/Modal";
import { Button } from "@/components/ui/Button";
import {
  validateImportRows,
  commitImportSiswa,
  type ParsedRow,
  type ValidatedRow,
  type ImportResult,
} from "@/actions/admin/siswa";

// ── Kolom wajib template ──────────────────────────────────────────────────────
const TEMPLATE_HEADERS = [
  "NIS",
  "Nama Lengkap",
  "Email",
  "Nama Kelas",
  "Singkatan Jurusan",
  "Tahun Masuk",
  "Password Awal",
];

// ── Fase wizard ────────────────────────────────────────────────────────────────
type Phase = "idle" | "parsing" | "preview" | "importing" | "done";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

// ── Helper: download template Excel ──────────────────────────────────────────
function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    // Contoh baris 1
    ["2025001", "Ahmad Fauzi", "ahmad.fauzi@siswa.sch.id", "XI PPLG 1", "PPLG", 2025, "siswa123"],
    // Contoh baris 2
    ["2025002", "Nadia Rahma", "nadia.rahma@siswa.sch.id", "X TJKT 1", "TJKT", 2025, "siswa123"],
  ]);

  // Lebar kolom
  ws["!cols"] = [
    { wch: 12 }, { wch: 24 }, { wch: 30 },
    { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.writeFile(wb, "template_import_siswa.xlsx");
}

// ── Parse workbook → ParsedRow[] ─────────────────────────────────────────────
function parseWorkbook(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          defval: "",
        });

        if (raw.length < 2) {
          reject(new Error("File kosong atau tidak ada data selain header."));
          return;
        }

        const rows: ParsedRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i] as unknown[];
          // Skip baris yang sepenuhnya kosong
          if (row.every((cell) => cell === "" || cell === null || cell === undefined)) continue;

          rows.push({
            rowNum: i + 1,
            nis: String(row[0] ?? "").trim(),
            nama: String(row[1] ?? "").trim(),
            email: String(row[2] ?? "").trim(),
            kelasNama: String(row[3] ?? "").trim(),
            jurusanAbbr: String(row[4] ?? "").trim().toUpperCase(),
            tahunMasuk: Number(row[5] ?? 0),
            passwordAwal: String(row[6] ?? "").trim(),
          });
        }
        resolve(rows);
      } catch {
        reject(new Error("Gagal membaca file Excel. Pastikan format file benar (.xlsx)."));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsArrayBuffer(file);
  });
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function ImportSiswaModal({ isOpen, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [parseError, setParseError] = useState<string | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const validRows = validatedRows.filter((r) => r.status === "valid");
  const errorRows = validatedRows.filter((r) => r.status === "error");

  // ── Reset saat tutup modal
  function handleClose() {
    setPhase("idle");
    setParseError(null);
    setValidatedRows([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  }

  // ── Upload & parse file
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setPhase("parsing");

    try {
      const parsed = await parseWorkbook(file);
      if (parsed.length === 0) {
        setParseError("Tidak ada baris data yang ditemukan di file.");
        setPhase("idle");
        return;
      }

      // Validasi baris terhadap DB (Server Action)
      startTransition(async () => {
        const validated = await validateImportRows(parsed);
        setValidatedRows(validated);
        setPhase("preview");
      });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Gagal memproses file.");
      setPhase("idle");
    }
  }

  // ── Konfirmasi import (hanya baris valid)
  function handleConfirmImport() {
    const toImport = validRows
      .filter((r) => r.status === "valid")
      .map((r) => ({
        rowNum: r.rowNum,
        nis: r.nis,
        nama: r.nama,
        email: r.email,
        kelasId: (r as Extract<ValidatedRow, { status: "valid" }>).kelasId,
        majorId: (r as Extract<ValidatedRow, { status: "valid" }>).majorId,
        tahunMasuk: r.tahunMasuk,
        passwordAwal: r.passwordAwal,
      }));

    setPhase("importing");
    startTransition(async () => {
      const result = await commitImportSiswa(toImport);
      setImportResult(result);
      setPhase("done");
    });
  }

  // ── Render sesuai fase
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Data Siswa dari Excel"
      size="lg"
    >
      {/* ── FASE: idle ─────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div className="space-y-5">
          {/* Info */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">Cara import:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
              <li>Unduh template Excel di bawah.</li>
              <li>Isi data siswa sesuai kolom yang tersedia.</li>
              <li>Upload file yang sudah diisi — akan muncul pratinjau sebelum disimpan.</li>
            </ol>
          </div>

          {/* Kolom wajib */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
              Kolom wajib di template
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_HEADERS.map((h) => (
                <span
                  key={h}
                  className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-mono text-neutral-700"
                >
                  {h}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              <strong>Nama Kelas</strong> & <strong>Singkatan Jurusan</strong> harus persis sama dengan data master
              (mis. <span className="font-mono">XI PPLG 1</span>,{" "}
              <span className="font-mono">PPLG</span>). Jika tidak ditemukan, baris akan ditandai error.
            </p>
          </div>

          {parseError && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {parseError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={downloadTemplate}
              className="gap-2"
            >
              <Download size={15} />
              Unduh Template
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 flex-1"
            >
              <Upload size={15} />
              Upload File Excel
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* ── FASE: parsing / validating ─────────────────────────────────────── */}
      {(phase === "parsing" || (phase === "preview" && isPending)) && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 size={36} className="animate-spin text-[#FF8833]" />
          <p className="text-sm text-neutral-600">
            {phase === "parsing" ? "Membaca file Excel..." : "Memvalidasi data ke database..."}
          </p>
        </div>
      )}

      {/* ── FASE: preview ──────────────────────────────────────────────────── */}
      {phase === "preview" && !isPending && (
        <div className="space-y-4">
          {/* Ringkasan */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-green-700">{validRows.length}</p>
              <p className="text-xs text-green-600 mt-0.5">Baris valid, siap diimpor</p>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-red-700">{errorRows.length}</p>
              <p className="text-xs text-red-600 mt-0.5">Baris error, tidak akan diimpor</p>
            </div>
          </div>

          {/* Tabel preview semua baris */}
          <div className="rounded-xl border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-neutral-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500 w-10">Baris</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">NIS</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">Nama</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">Kelas</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">Jurusan</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-500">Keterangan Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {validatedRows.map((row) => (
                    <tr
                      key={row.rowNum}
                      className={row.status === "error" ? "bg-red-50" : "bg-white"}
                    >
                      <td className="px-3 py-2 text-neutral-400">{row.rowNum}</td>
                      <td className="px-3 py-2">
                        {row.status === "valid" ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                            <CheckCircle2 size={13} /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                            <XCircle size={13} /> Error
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-neutral-700">{row.nis || "—"}</td>
                      <td className="px-3 py-2 text-neutral-800">{row.nama || "—"}</td>
                      <td className="px-3 py-2 text-neutral-600">{row.kelasNama || "—"}</td>
                      <td className="px-3 py-2 text-neutral-600">{row.jurusanAbbr || "—"}</td>
                      <td className="px-3 py-2 text-red-600">
                        {row.status === "error"
                          ? row.errors.join(" • ")
                          : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {errorRows.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>
                {errorRows.length} baris error tidak akan diimpor.{" "}
                {validRows.length > 0
                  ? `${validRows.length} baris valid tetap akan diimpor jika Anda klik Konfirmasi Import.`
                  : "Perbaiki file Excel dan upload ulang."}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={() => {
                setPhase("idle");
                setValidatedRows([]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="flex-1"
            >
              Upload Ulang
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={validRows.length === 0}
              className="flex-1 gap-2"
            >
              <CheckCircle2 size={15} />
              Konfirmasi Import ({validRows.length} siswa)
            </Button>
          </div>
        </div>
      )}

      {/* ── FASE: importing ────────────────────────────────────────────────── */}
      {phase === "importing" && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 size={36} className="animate-spin text-[#FF8833]" />
          <p className="text-sm text-neutral-600">Menyimpan data ke database...</p>
        </div>
      )}

      {/* ── FASE: done ─────────────────────────────────────────────────────── */}
      {phase === "done" && importResult && (
        <div className="space-y-5">
          {/* Hasil */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-green-50 border border-green-100 px-3 py-4">
              <p className="text-3xl font-bold text-green-700">{importResult.imported}</p>
              <p className="text-xs text-green-600 mt-1">Berhasil diimpor</p>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-4">
              <p className="text-3xl font-bold text-red-700">{importResult.skipped}</p>
              <p className="text-xs text-red-600 mt-1">Dilewati</p>
            </div>
            <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-3 py-4">
              <p className="text-3xl font-bold text-neutral-700">
                {importResult.imported + importResult.skipped}
              </p>
              <p className="text-xs text-neutral-500 mt-1">Total diproses</p>
            </div>
          </div>

          {/* Errors pada fase import (race condition dll) */}
          {importResult.errors.length > 0 && (
            <div className="rounded-xl border border-red-100 overflow-hidden">
              <div className="bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                Error saat menyimpan
              </div>
              <div className="divide-y divide-red-50 max-h-40 overflow-y-auto">
                {importResult.errors.map((e, i) => (
                  <div key={i} className="px-4 py-2 text-xs text-red-700">
                    <span className="font-semibold">Baris {e.rowNum}</span> — {e.nis} {e.nama}: {e.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleClose} className="w-full">
            Selesai
          </Button>
        </div>
      )}
    </Modal>
  );
}
