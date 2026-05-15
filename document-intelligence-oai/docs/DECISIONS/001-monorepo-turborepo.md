# 001. Monorepo con Turborepo

## Estado

Aceptada.

## Contexto

El producto tiene una app web, paquetes compartidos y modulos independientes.

## Decision

Usar pnpm workspaces y Turborepo para cachear build, lint, typecheck y tests.

## Consecuencias

Los modulos pueden evolucionar aislados sin perder una experiencia de desarrollo unica.
