# EnvHeaven Offline Web UI — Agent Conventions

## Angular component / artifact generation

**All Angular artifacts (components, services, pipes, directives) must be created
with `ng generate`.  Never hand-write a new artifact file.**

```bash
# From the package root (envheaven-pkg-plugin-offiline-web-ui-01/)
npx ng generate component views/my-view
npx ng generate service  services/my-service
npx ng generate pipe     pipes/my-pipe
npx ng generate directive directives/my-directive
```

## No inline templates or styles

`template:` and `styles:` inside `@Component` are **forbidden**.
Every component must use separate files:

```ts
@Component({
  templateUrl: './my-component.component.html',
  styleUrl:    './my-component.component.css',
})
```

This applies to **all** Angular source under this package, including files in
`libs/`.

## Build

```bash
cd artifacts/envheaven-eh-env-eh-pkg-01/artifacts/envheaven-pkg-plugin-offiline-web-ui-01
pnpm run build
```

`build` runs `gen-env` (generates `src/web/environments/environment.ts` from
`package.json`), then `ng build`, then `tsc`.

## Git sync

After completing work, run from workspace root:

```bash
bash scripts/git-sync-all.sh
```

Never use `git rebase`. Use `git merge -X ours` on conflicts.
