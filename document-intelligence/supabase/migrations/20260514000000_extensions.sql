-- 20260514000000_extensions.sql
-- Enable required Postgres extensions for the platform.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;     -- fuzzy text matching for CFDI reconciliation
create extension if not exists vector;      -- pgvector for module 3 (contracts) RAG
create extension if not exists pg_cron with schema extensions;  -- scheduled tasks (alerts)
