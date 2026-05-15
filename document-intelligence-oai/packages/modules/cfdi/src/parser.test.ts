import { describe, expect, it } from "vitest";
import { parseCfdiXml } from "./parser";
import { parseBankCsv } from "./bank";
import { reconcileCfdis } from "./reconciliation";
import { calculateRfcCheckDigit, isValidRfc } from "./rfc";

const cfdiXml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="4.0" Fecha="2026-04-10T10:30:00" Total="12500.00" Moneda="MXN" TipoDeComprobante="I">
  <cfdi:Emisor Rfc="MARI9001015W4" Nombre="Marvicqui Servicios SA de CV" />
  <cfdi:Receptor Rfc="COSC8001137NA" Nombre="Constructora Sierra Centro SA" />
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital UUID="11111111-2222-4333-8444-555555555555" />
  </cfdi:Complemento>
</cfdi:Comprobante>`;

describe("CFDI parser", () => {
  it("extracts deterministic SAT fields from XML", () => {
    expect(parseCfdiXml(cfdiXml)).toMatchObject({
      uuid: "11111111-2222-4333-8444-555555555555",
      issuerRfc: "MARI9001015W4",
      receiverRfc: "COSC8001137NA",
      total: 12500,
      type: "I"
    });
  });

  it("parses BBVA CSV rows", () => {
    const rows = parseBankCsv("Fecha,Concepto,Importe,Referencia\n2026-04-11,SPEI MARI9001015W4,12500,TRX-1", "bbva");
    expect(rows[0]).toMatchObject({ id: "TRX-1", amount: 12500 });
  });

  it("runs exact reconciliation pass", () => {
    const cfdi = parseCfdiXml(cfdiXml);
    const transactions = parseBankCsv("Fecha,Concepto,Importe,Referencia\n2026-04-11,SPEI MARI9001015W4,12500,TRX-1", "bbva");
    expect(reconcileCfdis([cfdi], transactions)[0]?.matchType).toBe("exact");
  });

  it("validates RFC check digits", () => {
    const base = "MARI9001015W";
    expect(isValidRfc(`${base}${calculateRfcCheckDigit(base)}`)).toBe(true);
    expect(isValidRfc("INVALIDO")).toBe(false);
  });
});
