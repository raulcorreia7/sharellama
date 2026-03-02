# Documentation Index

## Getting Started

- [README](../README.md) - Project overview and quick start
- [Development](DEVELOPMENT.md) - Local development setup

## Reference

- [API](API.md) - REST API endpoints, request/response formats
- [Database](DATABASE.md) - Schema, tables, indexes, migrations
- [Types](TYPES.md) - TypeScript types and Zod validation schemas

## Architecture

- [Architecture](ARCHITECTURE.md) - System design, data flow, decisions

## Operations

- [Deployment](DEPLOYMENT.md) - Production deployment guide
- [Runbook](RUNBOOK.md) - Operational procedures, troubleshooting

## Quick Links

| I need to...               | Go to                           |
| -------------------------- | ------------------------------- |
| Start local development    | [Development](DEVELOPMENT.md)   |
| Understand an API endpoint | [API Reference](API.md)         |
| Check database schema      | [Database](DATABASE.md)         |
| Find a type definition     | [Types](TYPES.md)               |
| Deploy to production       | [Deployment](DEPLOYMENT.md)     |
| Debug an issue             | [Runbook](RUNBOOK.md)           |
| Understand system design   | [Architecture](ARCHITECTURE.md) |

## Architecture Decisions

Architecture Decision Records (ADRs) are stored in `docs/decisions/`:

- `NNNN-title.md` - Numbered decision records with context, decision, and consequences

## Maintenance

Documentation is reviewed:

- On significant feature changes
- Before releases
- When drift is detected (code vs docs mismatch)
