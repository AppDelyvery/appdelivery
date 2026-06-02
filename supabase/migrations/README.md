# Migrations — APPDELYVERY

O schema completo (tabelas, enums, PostGIS, função `find_entregadores_proximos`, RLS)
está especificado em `build-spec/02-BANCO-DADOS.md` no segundo-cérebro.

As migrations (`v1_schema.sql`, `v2_rls.sql`, …) entram aqui **quando a conta Supabase
dedicada do APPDELYVERY existir** — não na conta da Impulso/systempalace.

Regras duras que valem aqui:
- **Migration antes do push** — coluna/tabela nova entra em prod antes do `git push`.
- **RLS sem subquery na própria tabela** — usar função `SECURITY DEFINER` (evita recursão).
- **Não gravar cada ping de GPS** — posição ao vivo via Realtime Broadcast; só amostra em `rastreios`.
- **Antecedentes são dado sensível (LGPD)** — só admin, nunca expostos ao negócio.
