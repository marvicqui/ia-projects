const rfcAlphabet = "0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ";

export function isValidRfc(rfc: string): boolean {
  const normalized = rfc.trim().toUpperCase();
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(normalized)) {
    return false;
  }

  return calculateRfcCheckDigit(normalized.slice(0, -1)) === normalized.at(-1);
}

export function calculateRfcCheckDigit(rfcWithoutDigit: string): string {
  const normalized = rfcWithoutDigit.trim().toUpperCase().padStart(12, " ");
  let sum = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index] ?? " ";
    const value = rfcAlphabet.indexOf(char);
    if (value < 0) {
      throw new Error(`Invalid RFC character: ${char}`);
    }
    sum += value * (13 - index);
  }

  const remainder = sum % 11;
  const digit = 11 - remainder;

  if (digit === 11) {
    return "0";
  }

  if (digit === 10) {
    return "A";
  }

  return String(digit);
}
