# BusStation — Frontend

Site de venda de passagens de ônibus do BusStation (React 19 + Vite). Consome a [BusStationAPI](https://github.com/heitorbolisw4/BusStationAPI).

## Rodando local

```bash
npm install
npm run dev        # http://localhost:5173 (porta fixa: é a origem liberada no CORS da API)
```

A URL da API em dev vem de `.env.development` (`http://localhost:5214`). Para sobrescrever só na sua máquina, crie `.env.development.local`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm test` | Vitest em modo watch |
| `npm run test:run` | Roda a suíte uma vez (é o que o CI usa) |
| `npm run coverage` | Suíte + relatório de cobertura em `coverage/` |
| `npm run lint` | oxlint |
| `npm run build` | Build de produção em `dist/` — **exige `VITE_API_URL`** |

## Testes

Vitest + Testing Library + jsdom, arquivos `*.test.js(x)` ao lado do código testado. Nenhum teste chama a API de verdade: `fetch` e os módulos de `src/api/` são substituídos por dublês. O fuso é fixado em `America/Sao_Paulo` (`src/test/setup.js`) para testes de data não dependerem da máquina.

## CI

`.github/workflows/ci.yml` roda `npm ci` → `lint` → `test:run` → `build` em todo PR e push na `main`.

## Deploy (staging — Vercel)

- Projeto Vercel importado deste repo: preset **Vite**, build `npm run build`, saída `dist`.
- `VITE_API_URL` = URL pública da API no Render, cadastrada em **Environment Variables** (Production e Preview). Não é segredo — vai para o bundle —, mas não fica no repo para cada ambiente ter a sua.
- O build **falha de propósito** se `VITE_API_URL` estiver vazia ou apontar para `localhost` (ver `vite.config.js`).
- Redeploy: push na `main` (o Vercel publica sozinho) ou "Redeploy" no painel. Trocar `VITE_API_URL` exige redeploy, porque a variável é embutida no build.
- **Limitações conhecidas (v1):**
  - Previews de PR não conseguem chamar a API (CORS libera só o domínio de produção).
  - Cold start: Render e Neon hibernam no plano free; a primeira requisição pode levar ~1 min. Depois de 5 s carregando, o site mostra um aviso em vez de parecer travado.

Escopo completo: `docs/deploy/escopo-deploy.md` no repo raiz do projeto.
# BusStationFrontEnd
