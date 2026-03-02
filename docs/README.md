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

### Review Triggers

Documentation must be updated:

1. **On significant feature changes** - New endpoints, schema changes, new pages
2. **Before releases** - Final review of all changed docs
3. **When drift is detected** - Code no longer matches documentation
4. **After bug fixes** - Update runbook if new troubleshooting steps discovered

### Documentation Checklist

When making changes, update:

| Change Type          | Update These Docs             |
| -------------------- | ----------------------------- |
| New API endpoint     | API.md, TYPES.md              |
| Schema change        | TYPES.md, DATABASE.md         |
| New table/column     | DATABASE.md                   |
| New config/env       | DEVELOPMENT.md, DEPLOYMENT.md |
| New command          | README.md, DEVELOPMENT.md     |
| Deployment change    | DEPLOYMENT.md                 |
| Operations procedure | RUNBOOK.md                    |
| Architecture change  | ARCHITECTURE.md               |

### Quality Checks

Before merging:

- [ ] Code matches documented behavior
- [ ] Examples are tested and working
- [ ] Links are not broken
- [ ] Screenshots/diagrams are current
- [ ] Migration steps documented (if breaking change)

### Documentation Drift Detection

Signs of drift:

- Code comments contradict docs
- API responses don't match documented format
- Commands no longer work as documented
- Missing new tables/columns in schema docs

If you spot drift, create an issue or update immediately.
