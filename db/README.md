# Database (MySQL)

Phase 1 of the [build plan](../health_app_v1_spec.md): the two core tables from the spec
(`interventions`, `user_assessments`) plus a minimal `users` table to satisfy the FK.

## Files
- `schema.sql` — creates the `pyramid` database and all three tables. **Re-runnable**: it
  drops the tables (reverse-FK order) and recreates them, so running it wipes existing data.
- `seed.sql` — inserts the 7 tier-1 interventions and one demo user.

## Create / reset the database
Local MySQL, `root` with no password (dev default):

```bash
mysql -u root < db/schema.sql
mysql -u root < db/seed.sql
```

If your MySQL needs a password, add `-p` (you'll be prompted):

```bash
mysql -u root -p < db/schema.sql
```

## Verify
```bash
mysql -u root pyramid -t -e "SELECT id, signal_key, effect_size, evidence_grade, effort_cost FROM interventions ORDER BY id;"
```
Expect **7 interventions**, **1 user**, valid JSON in `prereq_of` / `citations`, and every
citation with `"verified": false`.

## Notes on the schema
- **PostgreSQL → MySQL:** the spec's `jsonb` and `text[]` become MySQL `JSON`; the spec's
  enums become native `ENUM(...)`.
- **Evidence grade** uses simplified **GRADE** (`high` / `moderate` / `low` / `very_low`),
  kept separate from `effect_size` (spec §4).
- **`citations`** is a JSON array of `{title, url, verified}`. Every seeded source is real
  but `verified: false` — the spec requires personal verification before a row ships (§4).
- **`prereq_of`** encodes the prioritization DAG: `sleep` is upstream of exercise + the diet
  signals; `diet_upf` is upstream of the other diet signals + energy_balance (this is how the
  spec's "surface UPF first" within-diet rule is represented in data, §3).
- **Provisional values:** `effect_size`, `evidence_grade`, `effort_cost`, and the scoring
  thresholds are defensible **starting** values (spec §4.2), not final.
