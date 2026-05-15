# JVP Document Intelligence

JVP Document Intelligence es un SaaS B2B para equipos mexicanos que necesitan revisar documentos regulatorios sin perder trazabilidad. El producto integra conciliacion CFDI contra estados de cuenta, cumplimiento laboral REPSE/IMSS/INFONAVIT/SAT y analisis de contratos con agentes especializados.

La arquitectura es modular, multi-tenant y reproducible. Cada modulo vive en su propio paquete, solo depende de paquetes compartidos y se comunica con el resto por eventos persistidos en Supabase.

## Quick start

```bash
pnpm install
pnpm dev
pnpm test
```

## Docs

- [Arquitectura](docs/ARCHITECTURE.md)
- [Modulos](docs/MODULES.md)
- [Deploy](docs/DEPLOYMENT.md)
- [Migracion a Azure](docs/AZURE_MIGRATION.md)

## Pantallas

- Dashboard: metricas globales, alertas y accesos rapidos a los tres modulos.
- CFDI: conciliaciones por estado de cuenta, matches exactos, difusos y asistidos.
- Laboral: semaforo por contratista y portal publico de carga documental.
- Contratos: visor, clausulas clasificadas, riesgos y resumen ejecutivo.
