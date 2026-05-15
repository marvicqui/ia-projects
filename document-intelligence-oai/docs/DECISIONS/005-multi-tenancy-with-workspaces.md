# 005. Multi-tenancy con workspaces

## Estado

Aceptada.

## Contexto

Cada cliente debe aislar documentos, usuarios, eventos y auditoria.

## Decision

Usar `workspaces` como raiz de tenancy y `workspace_members` para RBAC. RLS valida lectura y escritura por membresia.

## Consecuencias

El aislamiento se aplica en base de datos y no depende solo del frontend.
