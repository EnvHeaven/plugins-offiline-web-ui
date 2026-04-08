# EnvHeaven Offline Web UI — Agent Conventions

## Angular component generation

All Angular components in this package **must** use separate template and style files.
Never use `template:` or `styles:` inline in `@Component`.

Always use:
```ts
@Component({
  templateUrl: './my-component.component.html',
  styleUrl:    './my-component.component.css',
})
```

When creating a new component, generate three files together:
- `my-component.component.ts`
- `my-component.component.html`
- `my-component.component.css`

## Build

```bash
cd artifacts/envheaven-eh-env-eh-pkg-01/artifacts/envheaven-pkg-plugin-offiline-web-ui-01
pnpm run build
```

`build` runs `gen-env` (generates `src/web/environments/environment.ts` from `package.json`)
then `ng build` then `tsc`.

## Git sync

After completing work, run from workspace root:

```bash
bash scripts/git-sync-all.sh
```

Never use `git rebase`. Use `git merge -X ours` on conflicts.
