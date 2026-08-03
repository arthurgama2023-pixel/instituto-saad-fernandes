# Histórico de Testes — Smart Doctor

Regra: teste ✅ numa entrada e ❌ na seguinte = REGRESSÃO (algo antigo quebrou).

> ⚠️ Este projeto ainda **não tem runner de teste** (nem vitest, jest, playwright
> ou cypress no `package.json`). Até isso mudar, a verificação possível é
> `npx tsc --noEmit` + conferência no navegador; as entradas abaixo registram isso
> em vez de contagem de testes. Ver `mapa-cobertura.md`.

---
## 2026-08-03 — A logo de verdade em todo o app
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação: `/medico`, `/admin`, `/` e `/medico/login` servem o traçado do balão
  e **nenhuma** delas serve mais o traçado do "S" antigo; `/appicon` responde
  200 image/png (14.7 KB).
- ⚠️ Sem screenshot do app: o Browser pane segue recolhido. A prova visual foi um
  comparativo renderizado à parte, nos tamanhos reais (21/34/46px).
- Regressões: nenhuma
- Branch: `feat/smart-doctor/cadastro-medico` · commit `b6c6e3e`

---
## 2026-08-03 — Verde da marca nos painéis médico e admin
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação no navegador (`/admin` e `/medico`, 1400px, tema claro e escuro):
  `--primary` e `--aurora` resolvem em verde; **0 elementos** ainda computando o
  azul antigo; contraste do botão primário medido em **4.71:1** com texto branco
  (AA exige 4.5:1); marca da sidebar sem sublinhado e herdando a cor do texto.
- ⚠️ Sem screenshot: o Browser pane estava recolhido (viewport 0px), então a
  verificação foi por valor computado, não visual.
- Regressões: nenhuma
- Branch: `feat/smart-doctor/cadastro-medico` · commit `c15b1c7`

---
## 2026-08-03 — Limpeza final do rebrand Smart Doctor
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação no navegador: `/paciente` em `localhost:3080` serve
  `<title>Smart Doctor</title>`, a description nova, e nenhuma ocorrência de
  "Instituto"/"Saad Fernandes" no HTML.
- Regressões: nenhuma detectável (sem histórico anterior para comparar — esta é a
  primeira entrada).
- Branch: `feat/smart-doctor/cadastro-medico`
