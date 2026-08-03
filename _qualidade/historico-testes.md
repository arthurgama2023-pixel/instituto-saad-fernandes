# Histórico de Testes — Smart Doctor

Regra: teste ✅ numa entrada e ❌ na seguinte = REGRESSÃO (algo antigo quebrou).

> ⚠️ Este projeto ainda **não tem runner de teste** (nem vitest, jest, playwright
> ou cypress no `package.json`). Até isso mudar, a verificação possível é
> `npx tsc --noEmit` + conferência no navegador; as entradas abaixo registram isso
> em vez de contagem de testes. Ver `mapa-cobertura.md`.

---
## 2026-08-03 — Limpeza final do rebrand Smart Doctor
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação no navegador: `/paciente` em `localhost:3080` serve
  `<title>Smart Doctor</title>`, a description nova, e nenhuma ocorrência de
  "Instituto"/"Saad Fernandes" no HTML.
- Regressões: nenhuma detectável (sem histórico anterior para comparar — esta é a
  primeira entrada).
- Branch: `feat/smart-doctor/cadastro-medico`
