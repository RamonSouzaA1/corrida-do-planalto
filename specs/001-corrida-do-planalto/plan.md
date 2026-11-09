# Implementation Plan: Corrida do Planalto

**Branch**: `001-corrida-do-planalto` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-corrida-do-planalto/spec.md`

## Summary

Endless runner em pixel art de 16 bits, em três faixas, no qual Chico persegue Caio por quatro
cidades. A abordagem técnica é um único código JavaScript que roda no navegador e é empacotado,
sem reescrita, para Android e iPhone. A lógica do jogo (faixas, colisão, distância até Caio,
vidas, power-ups, progressão) fica em módulos puros, sem dependência do motor, testados
isoladamente; o motor de jogo cuida só de renderização, entrada, áudio e cenas. Nomes e visuais
dos personagens vêm de um arquivo de configuração. A entrega segue as prioridades da spec: o MVP
(Brasília, histórias 1 e 2) primeiro; depois energia, vidas e power-ups; depois as outras cidades;
depois o empacotamento mobile.

## Technical Context

**Language/Version**: JavaScript (ES2022, módulos ES), Node.js 20 LTS ou superior só para
ferramentas de desenvolvimento

**Primary Dependencies**: Phaser 3 (motor 2D com Arcade Physics, versão 3.x fixada no
`package.json`); Vite (servidor de desenvolvimento e build estático); Capacitor (empacotamento
Android e iOS, só na fase mobile)

**Storage**: `localStorage` do navegador, por trás de uma camada fina (`src/platform/storage.js`),
para melhor pontuação, cidade alcançada, vidas e preferência de som

**Testing**: Vitest para testes unitários e de integração da lógica pura (incluindo simulação de
corridas completas sem renderização); Playwright para um teste de fumaça no navegador (carrega,
inicia, joga alguns segundos, sem erros de console); playtest manual em navegador mobile

**Target Platform**: navegadores modernos de computador e celular (Chrome, Safari, Firefox,
Edge); Android e iOS via Capacitor na fase mobile

**Project Type**: jogo web (aplicativo de página única, cliente apenas, sem backend)

**Performance Goals**: 60 quadros por segundo em aparelhos de gama média (computador e celular);
resposta a comando em menos de 100 ms; carregamento inicial até a tela de título em menos de 10 s
em conexão comum

**Constraints**: funciona offline depois de carregado; resolução nativa 180 x 320 (retrato, câmera atrás do corredor) com escala de
pixels nítidos; no máximo 16 cores por cenário; sem backend, login ou rede obrigatória; ativos
com licença conhecida

**Scale/Scope**: 4 cidades, 4 personagens, 3 power-ups, 1 item especial, cerca de 6 telas (título,
corrida, pausa, fase vencida, fim de jogo, vitória final); jogador único

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Como o plano atende |
|-----------|-----------|---------------------|
| I. Simplicidade Primeiro (YAGNI) | Aprovado | Um único projeto, sem backend, sem framework de interface, sem banco. Só três dependências de produção ou desenvolvimento relevantes (Phaser, Vite, Vitest). Capacitor só entra na fase mobile. |
| II. Qualidade de Código | Aprovado | Lógica em `src/core` (pura, testável) separada de `src/scenes` e `src/platform`. ESLint e Prettier obrigatórios no CI local e nos testes. |
| III. Desempenho e Experiência | Aprovado | Metas de 60 fps e 100 ms definidas acima e verificadas na quickstart; entrada por teclado e toque com os mesmos comandos; interface com contraste e dicas de controle. |
| IV. Web First e Portabilidade Mobile | Aprovado | JavaScript, roda direto no navegador; build estático servível por qualquer servidor de arquivos; layout escalado e responsivo; APIs de plataforma isoladas em `src/platform`; Capacitor reaproveita o mesmo build. |

Restrições Técnicas da Constituição: sem backend (ok); dependências justificadas em
[research.md](research.md) (ok); licença dos ativos registrada em `assets/LICENSES.md` (ok).

**Resultado**: nenhuma violação; a tabela de Complexity Tracking permanece vazia.

**Reavaliação após o desenho da Fase 1**: o desenho mantém a lógica pura em `src/core`, sem
dependência do motor, e usa apenas `localStorage` para guardar dados. Nenhuma violação nova.

## Project Structure

### Documentation (this feature)

```text
specs/001-corrida-do-planalto/
├── plan.md              # Este arquivo (saída do /speckit-plan)
├── research.md          # Saída da Fase 0
├── data-model.md        # Saída da Fase 1
├── quickstart.md        # Saída da Fase 1
├── contracts/           # Saída da Fase 1
│   ├── characters.schema.json
│   ├── save-data.schema.json
│   └── input-commands.md
└── tasks.md             # Saída da Fase 2 (/speckit-tasks, não criado aqui)
```

### Source Code (repository root)

```text
index.html
package.json
vite.config.js
src/
├── main.js                 # Cria o jogo Phaser e registra as cenas
├── config/
│   ├── characters.json     # Nomes e sprites dos personagens (FR-017)
│   ├── cities.json         # Paleta, obstáculos e coletáveis por cidade
│   ├── balance.json        # Valores de balanceamento (ritmo, pontos, durações)
│   └── i18n/               # pt.json, es.json, en.json
├── core/                   # Lógica pura, sem Phaser
│   ├── run.js              # Estado e atualização da corrida (tick)
│   ├── lanes.js            # Faixas, troca, pulo e deslize
│   ├── collision.js        # Colisão e regras de energia
│   ├── chase.js            # Distância até Caio e confronto do avião
│   ├── spawner.js          # Geração de obstáculos e coletáveis por cidade
│   ├── powerups.js         # Bandeira, cartaz, mala e faixa presidencial
│   ├── progress.js         # Vidas, cidade alcançada, vida extra
│   └── score.js            # Pontuação e melhor pontuação
├── scenes/                 # Phaser: Boot, Title, Run, Pause, Result
├── input/                  # Teclado e toque convertidos em comandos
├── platform/               # storage.js, lifecycle.js (pausa por foco), audio.js
└── assets/                 # sprites, fundos, áudio e LICENSES.md

tests/
├── unit/                   # core/* isolado
├── integration/            # corridas simuladas completas sem renderização
└── smoke/                  # Playwright: abre, joga, sem erros

android/ e ios/             # Gerados pelo Capacitor na fase mobile
```

**Structure Decision**: projeto único de jogo web, com uma pasta `core` pura e testável, separada
das cenas do motor (`scenes`), da entrada (`input`) e das APIs de plataforma (`platform`). Não há
backend. As pastas `android/` e `ios/` só aparecem na fase mobile, geradas pelo Capacitor a partir
do mesmo build estático.

## Complexity Tracking

Sem violações da Constituição; nada a justificar.
