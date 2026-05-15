export { parseCfdiXml, CfdiParseError } from './cfdi-xml';
export { parseBbvaCsv } from './bank-bbva';
export { parseSantanderCsv } from './bank-santander';
export { parseBanamexCsv } from './bank-banamex';

import type { BankCode, ParsedBankStatement } from '../types';
import { parseBbvaCsv } from './bank-bbva';
import { parseSantanderCsv } from './bank-santander';
import { parseBanamexCsv } from './bank-banamex';

export const parseBankCsv = (bank: BankCode, csv: string): ParsedBankStatement => {
  switch (bank) {
    case 'BBVA':
      return parseBbvaCsv(csv);
    case 'SANTANDER':
      return parseSantanderCsv(csv);
    case 'BANAMEX':
      return parseBanamexCsv(csv);
    default:
      throw new Error(`Unsupported bank: ${bank}. Use Claude PDF vision fallback for unknown formats.`);
  }
};
