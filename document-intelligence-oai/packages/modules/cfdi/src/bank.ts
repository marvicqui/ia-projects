import type { BankTransaction } from "./index";

export type BankFormat = "bbva" | "santander" | "banamex";

export function parseBankCsv(csv: string, bank: BankFormat): BankTransaction[] {
  const rows = parseCsv(csv);
  const [header, ...data] = rows;

  if (!header) {
    return [];
  }

  return data
    .filter((row) => row.length > 1)
    .map((row, index) => normalizeRow(header, row, bank, index));
}

function normalizeRow(header: string[], row: string[], bank: BankFormat, index: number): BankTransaction {
  const record = Object.fromEntries(header.map((key, keyIndex) => [normalizeHeader(key), row[keyIndex] ?? ""]));

  if (bank === "bbva") {
    return withOptionalReference({
      id: record.referencia || `bbva-${index}`,
      date: readField(record, "fecha"),
      concept: readField(record, "concepto"),
      amount: toAmount(readField(record, "importe", "monto"))
    }, record.referencia);
  }

  if (bank === "santander") {
    return withOptionalReference({
      id: record.referencia || `santander-${index}`,
      date: readField(record, "fechaoperacion", "fecha"),
      concept: readField(record, "descripcion", "concepto"),
      amount: toAmount(readField(record, "cargoabono", "importe"))
    }, record.referencia);
  }

  return withOptionalReference({
    id: record.referencia || `banamex-${index}`,
    date: readField(record, "fecha"),
    concept: readField(record, "descripcion", "concepto"),
    amount: toAmount(readField(record, "depositos", "retiros", "importe"))
  }, record.referencia);
}

function withOptionalReference(transaction: Omit<BankTransaction, "reference">, reference: string | undefined): BankTransaction {
  return reference ? { ...transaction, reference } : transaction;
}

function readField(record: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value) {
      return value;
    }
  }

  return "";
}

function parseCsv(csv: string): string[][] {
  return csv
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function toAmount(value: string): number {
  return Number(value.replace(/[$,\s]/g, ""));
}
