# Smart Doctor — Documentação Completa da Startup

> Plataforma de telemedicina com Inteligência Artificial.
> Evolução do projeto `agenda-ai/` para uma HealthTech premium completa.

## Estrutura da documentação (9 etapas)

| # | Documento | Conteúdo | Status |
|---|-----------|----------|--------|
| 1 | [01-VISAO-E-BRANDING.md](01-VISAO-E-BRANDING.md) | Visão do produto, marca, slogans, logo, cores, tipografia | ✅ Aprovada (Clara como nome da IA) |
| 2 | [02-DESIGN-SYSTEM.md](02-DESIGN-SYSTEM.md) | Tokens, componentes (botões, cards, calendário, chat, vídeo, prontuário…) | ✅ Aprovada |
| 3 | [03-FLUXOS-E-JORNADAS.md](03-FLUXOS-E-JORNADAS.md) | Jornada do Paciente, Médico e Admin; fluxo WhatsApp completo | ✅ Aprovada |
| 4 | [04-TELAS-E-WIREFRAMES.md](04-TELAS-E-WIREFRAMES.md) | Wireframes em texto de todas as telas (app + web + admin) | ✅ Aprovada |
| 5 | [05-INTELIGENCIA-ARTIFICIAL.md](05-INTELIGENCIA-ARTIFICIAL.md) | Arquitetura da IA, ferramentas, prompts, painel administrativo da IA | ✅ Aprovada |
| 6 | [06-ARQUITETURA-TECNICA.md](06-ARQUITETURA-TECNICA.md) | Stack, infraestrutura, banco de dados, APIs, escalabilidade | ✅ Aprovada |
| 7 | [07-SEGURANCA-E-LGPD.md](07-SEGURANCA-E-LGPD.md) | Dados sensíveis de saúde, consentimento, criptografia, auditoria | ✅ Aprovada |
| 8 | [08-NEGOCIO-E-ROADMAP.md](08-NEGOCIO-E-ROADMAP.md) | Monetização, planos, roadmap MVP → Enterprise | ✅ Aprovada |
| 9 | [09-CRESCIMENTO-E-LANCAMENTO.md](09-CRESCIMENTO-E-LANCAMENTO.md) | Go-to-market, App Store / Google Play, diferenciais competitivos | ✅ Entregue — DOCUMENTAÇÃO COMPLETA 🎉 |

## Identidade visual (preview vivo)

Página interativa da marca (logo S-Pulse, paleta, tipografia, componentes, chat da Clara):
https://claude.ai/code/artifact/690f8c86-04e4-4582-8fb8-19bd55a6b52a

## Regra de trabalho

Cada etapa é entregue individualmente e **só avançamos após aprovação explícita**.
Ajustes pedidos em uma etapa são aplicados antes de abrir a próxima.

## Relação com o projeto anterior

O `agenda-ai/` (deploy: https://agenda-ai-62lz.onrender.com) serve de base comprovada para:

- Canal WhatsApp via Evolution API (pareamento por código, webhook, allowlist)
- Parser de intenção com Gemini via function calling
- Transcrição de áudio (Gemini multimodal / Groq Whisper)
- Sessão própria com jose + criptografia AES-256-GCM de tokens
- Padrão de módulos desacoplados por interfaces (`CalendarProvider`, `Channel`, `TranscriptionProvider`)

O Smart Doctor **não é um fork** — é um produto novo que reaproveita esses aprendizados.
