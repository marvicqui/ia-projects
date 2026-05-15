import { XMLParser } from "fast-xml-parser";
import type { ParsedCfdi } from "./index";

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true
});

export function parseCfdiXml(xml: string): ParsedCfdi {
  const parsed = parser.parse(xml) as XmlNode;
  const comprobante = readNode(parsed, "cfdi:Comprobante", "Comprobante");
  const emisor = readNode(comprobante, "cfdi:Emisor", "Emisor");
  const receptor = readNode(comprobante, "cfdi:Receptor", "Receptor");
  const complemento = readNode(comprobante, "cfdi:Complemento", "Complemento");
  const timbre = readNode(complemento, "tfd:TimbreFiscalDigital", "TimbreFiscalDigital");

  return {
    uuid: readString(timbre, "UUID"),
    issuerRfc: readString(emisor, "Rfc"),
    receiverRfc: readString(receptor, "Rfc"),
    total: Number(readString(comprobante, "Total")),
    issuedAt: readString(comprobante, "Fecha"),
    type: readString(comprobante, "TipoDeComprobante") as ParsedCfdi["type"]
  };
}

function readNode(node: XmlNode, ...keys: string[]): XmlNode {
  for (const key of keys) {
    const value = node[key];
    if (isRecord(value)) {
      return value;
    }
  }

  throw new Error(`Missing XML node: ${keys.join(" or ")}`);
}

function readString(node: XmlNode, key: string): string {
  const value = node[key];

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  throw new Error(`Missing XML attribute: ${key}`);
}

function isRecord(value: unknown): value is XmlNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
