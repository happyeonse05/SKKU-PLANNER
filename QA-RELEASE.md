# Public beta QA pass

Additional hardening in this pass:
- Schedule overlap detection with explicit confirmation before saving conflicting classes.
- AI endpoint timeout (12s) so a dead backend cannot leave the planner spinning indefinitely.
- AI JSON shape validation and top-3 cap before rendering/saving.
- Backup import rejects files over 2 MB and unsupported newer backup versions.
- Existing user-scoped Supabase reads, serialized saves, local smart-planner fallback, RLS SQL, backup restore, and destructive-action confirmations retained.

External launch gates that cannot be proven by static source inspection:
- Run SUPABASE-RLS.sql in the real Supabase project and verify with two accounts.
- Add the production GitHub Pages URL to Supabase Auth redirect allow-list.
- GitHub Actions must pass npm run build. This environment could not reach npm registry.
- Test on real iPhone/Safari and Android/Chrome before charging users.
