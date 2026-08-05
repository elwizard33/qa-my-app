<!--
CONTRIBUTING.md asks for one change per PR. Mixed refactor + behaviour + docs
patches are slow to review and hard to revert.
-->

## What changed

<!-- One or two sentences. What does this PR do, and why? -->

## Type of change

- [ ] Bug fix
- [ ] New feature (skill, agent, script, hook)
- [ ] Docs only
- [ ] Refactor / internal cleanup
- [ ] Breaking change

## Checklist

- [ ] `npm test` passes (`node --test "tests/*.test.mjs"`)
- [ ] `npm run validate` passes — `plugin validate --strict` on **both** manifests
- [ ] Behaviour change is covered by a test under `tests/`
- [ ] [CHANGELOG.md](../CHANGELOG.md) updated under `[Unreleased]`
- [ ] Docs updated — README, `site/src/content/docs/`, and `docs/ARCHITECTURE.md` as applicable

## If this touches a subagent

- [ ] `model: inherit` (never a hardcoded model id)
- [ ] No `hooks`, `mcpServers`, or `permissionMode` on a **plugin-scope** agent — those are silently ignored ([docs](https://code.claude.com/docs/en/sub-agents))
- [ ] New plugin-scope agents added to the `agents` allowlist in `plugin.json`

## If this touches a skill

- [ ] `disable-model-invocation: true` if it rewrites the catalog or drives a browser
- [ ] Every spawned agent declared in `allowed-tools`
- [ ] No `${user_config.<sensitive_key>}` in the body — sensitive config never substitutes into skill content

## Breaking changes

<!-- Delete if not applicable. Note the migration path users need, and remember
     the plugin slug is immutable once published to the community catalog. -->
