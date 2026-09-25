# Known advisories

## GHSA-ggr8-5vv4-36mx — deepmerge-ts < 8.0.0 (high)

`npm audit` reports three high-severity entries that all trace to one package:

```
prisma -> @prisma/config -> deepmerge-ts@7.1.5
```

**Not fixable from this repository. Removed from the image that serves traffic by
an explicit delete, not by `--omit=dev`.**

- `prisma` is a **devDependency**. It is the migration CLI. The runtime client
  is `@prisma/client`, which does not itself depend on `deepmerge-ts`.
- **`--omit=dev` does not remove it.** An earlier version of this note claimed it
  did; that was wrong. `@prisma/client` declares `prisma` and `typescript` as
  **peerDependencies**, and npm installs the peers of a production dependency as
  production. Neither `--omit=dev` nor `--omit=peer` drops them — both were tried
  against the real lockfile, and the CLI was then found inside a built image.
- What actually removes it is an explicit `rm -rf` in the runtime stage of
  `apps/api/Dockerfile`, in the same layer as the install so the bytes never
  persist. That also takes about 110MB off the image. The `migrate` stage keeps the
  CLI, because migrations need it.
- Verified afterwards: reads, a transactional write and a bcrypt sign-in all work
  in the pruned image.
- The advisory is a stack exhaustion when merging recursive object graphs. In
  this dependency the only input is the local Prisma config file, which is
  committed to this repository.
- `npm audit fix` cannot resolve it: the advisory range covers every Prisma 6.x.
- An `overrides` entry forcing `deepmerge-ts@^8` does not work either —
  version 8 is ESM-only (`"type": "module"`) while `@prisma/config` loads it
  with `require()` from CommonJS, so forcing it breaks the Prisma CLI outright.

It needs an upstream release from Prisma. Re-check with `npm audit` after any
Prisma upgrade and delete this file once it clears.
