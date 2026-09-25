# Known advisories

## GHSA-ggr8-5vv4-36mx — deepmerge-ts < 8.0.0 (high)

`npm audit` reports three high-severity entries that all trace to one package:

```
prisma -> @prisma/config -> deepmerge-ts@7.1.5
```

**Not fixable from this repository, and not reachable in the deployed app.**

- `prisma` is a **devDependency**. It is the migration CLI. The runtime client
  is `@prisma/client`, which does not depend on `deepmerge-ts`.
- The API image installs with `--omit=dev`, so the package is not present in
  anything that serves traffic.
- The advisory is a stack exhaustion when merging recursive object graphs. In
  this dependency the only input is the local Prisma config file, which is
  committed to this repository.
- `npm audit fix` cannot resolve it: the advisory range covers every Prisma 6.x.
- An `overrides` entry forcing `deepmerge-ts@^8` does not work either —
  version 8 is ESM-only (`"type": "module"`) while `@prisma/config` loads it
  with `require()` from CommonJS, so forcing it breaks the Prisma CLI outright.

It needs an upstream release from Prisma. Re-check with `npm audit` after any
Prisma upgrade and delete this file once it clears.
