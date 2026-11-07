---

description: "Lista de tarefas da Corrida do Planalto"
---

# Tasks: Corrida do Planalto

**Input**: Documentos de design em `/specs/001-corrida-do-planalto/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos. A Constituição (Fluxo de Desenvolvimento) exige testes automatizados da lógica do jogo; por isso cada história tem testes da lógica pura em `src/core`, escritos antes da implementação.

**Organization**: Tarefas agrupadas por história de usuário da spec, para implementar e testar cada uma de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: História de usuário da tarefa (US1 a US5)
- Todas as tarefas trazem o caminho exato do arquivo

## Path Conventions

Projeto único de jogo web (ver Structure Decision em plan.md): `src/`, `tests/` na raiz do repositório. A lógica pura fica em `src/core` e NÃO importa Phaser.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialização do projeto e estrutura básica

- [X] T001 Criar `package.json` na raiz com `"type": "module"`, dependências `phaser` (3.x) e devDependencies `vite`, `vitest`, `eslint`, `prettier`, `@playwright/test`, e scripts `dev`, `build`, `preview`, `lint`, `test`, `test:smoke`, fixando as versões exatas instaladas
- [X] T002 [P] Criar `index.html` e `vite.config.js` na raiz, com `base: './'` para o build estático funcionar em qualquer pasta e `index.html` carregando `/src/main.js`
- [X] T003 [P] Configurar lint e formatação em `eslint.config.js` e `.prettierrc`, com regra que proíbe `import` de `phaser` dentro de `src/core/**`
- [X] T004 [P] Criar `vitest.config.js` (ambiente Node, testes em `tests/unit` e `tests/integration`) e `playwright.config.js` (testes em `tests/smoke`, servindo o build com `vite preview`)
- [X] T005 Criar a estrutura de pastas do plan.md (`src/config/i18n`, `src/core`, `src/scenes`, `src/input`, `src/platform`, `src/assets`, `tests/unit`, `tests/integration`, `tests/smoke`) e `src/assets/LICENSES.md` com a tabela vazia de ativos (arquivo, origem, licença)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura que DEVE existir antes de qualquer história

**⚠️ CRITICAL**: Nenhuma história começa antes desta fase terminar

- [X] T006 [P] Implementar gerador pseudoaleatório com semente em `src/core/rng.js` (função `createRng(seed)` que devolve `next()` em [0,1), determinístico) e testes em `tests/unit/rng.test.js`
- [X] T007 [P] Implementar acumulador de passo de tempo fixo (60 passos por segundo) em `src/core/clock.js` (`createClock(step)` com `advance(deltaMs, onStep)`) e testes em `tests/unit/clock.test.js`
- [X] T008 [P] Criar `src/config/balance.json` com os valores iniciais: velocidade inicial e aceleração, `distanceCloseRatePerSecond`, `coinDistanceBonus`, `collisionDistancePenalty`, `minVictoryDistance`, pontos por moeda, `extraLifeScore`, `presidentialSashEveryMeters`, `commandQueueMs`, `swipeMinPixels`, `shieldSeconds: 8`, `boostSeconds: 5`, `moneyBagMeters: 50`
- [X] T009 [P] Implementar `src/platform/storage.js` (`loadSave`, `writeSave`) com `localStorage` em try/catch, chave versionada, validação contra `contracts/save-data.schema.json` (`version` = 1, `bestScore` inteiro ≥ 0, `cityReached` em `brasilia | assuncao | buenos-aires | washington`, `lives` inteiro ≥ 0, `soundOn` booleano) e descarte do dado inválido, voltando aos valores iniciais (`bestScore` 0, `brasilia`, 3 vidas, som ligado); testes em `tests/unit/storage.test.js` com armazenamento bloqueado e dado corrompido
- [X] T010 [P] Implementar `src/config/characters.js` e `src/config/characters.json`: carregar `runner`, `target`, `guard`, `reporter` (cada um com `name` não vazio e `sprite`), validar contra `contracts/characters.schema.json`, usar nome e sprite padrão e avisar no console quando faltar ou for inválido (FR-017); testes em `tests/unit/characters.test.js`
- [X] T011 [P] Implementar `src/input/commands.js` com os comandos `LEFT`, `RIGHT`, `JUMP`, `SLIDE`, `PAUSE` de `contracts/input-commands.md`, e fila de comandos que expira após `commandQueueMs` de `balance.json`; testes em `tests/unit/commands.test.js`
- [X] T012 [P] Implementar `src/i18n.js` (função `t(key)`, idioma padrão `pt`) e `src/config/i18n/pt.json` com as chaves de título, pausa, fim de jogo, fase vencida e HUD
- [X] T013 [P] Implementar `src/platform/lifecycle.js` que emite o comando `PAUSE` quando a página perde o foco ou vai para segundo plano (`visibilitychange` e `blur`) e testes em `tests/unit/lifecycle.test.js` com eventos simulados
- [X] T014 Implementar `src/main.js` com a configuração Phaser: resolução 320 x 180, `pixelArt: true`, `scale.mode = FIT` centralizado, e registro das cenas; criar `src/scenes/BootScene.js` que carrega os ativos e abre a tela de título

**Checkpoint**: Base pronta; as histórias podem começar

---

## Phase 3: User Story 1 - Correr e desviar em Brasília (Priority: P1) 🎯 MVP

**Goal**: Corrida jogável em três faixas em Brasília: trocar de faixa, pular, deslizar, coletar moedas, bater e ver a pontuação final com a opção de jogar de novo.

**Independent Test**: Iniciar uma corrida, usar os quatro comandos com o teclado, coletar moedas e bater; a pontuação sobe com as moedas e a tela de fim de jogo mostra a pontuação final com a opção de recomeçar.

### Tests for User Story 1 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO e confirmar que FALHAM antes da implementação**

- [X] T015 [P] [US1] Teste de faixas em `tests/unit/lanes.test.js`: trocar de faixa para os dois lados, comando para fora da pista sem efeito, `JUMP` e `SLIDE` só aceitos quando o personagem está correndo, ação termina após a duração
- [X] T016 [P] [US1] Teste de colisão em `tests/unit/collision.test.js`: obstáculo `low` só é evitado pulando, `high` só deslizando, obstáculo de outra faixa não colide, e uma colisão encerra a corrida no MVP
- [X] T017 [P] [US1] Teste de pontuação em `tests/unit/score.test.js`: moeda soma pontos, melhor pontuação só sobe, nunca desce
- [X] T018 [P] [US1] Teste do gerador de obstáculos em `tests/unit/spawner.test.js`: mesma semente gera a mesma sequência, nunca bloqueia as três faixas ao mesmo tempo, há sempre um caminho possível
- [X] T019 [P] [US1] Teste de integração em `tests/integration/run-mvp.test.js`: corrida simulada sem renderização, a velocidade aumenta com o tempo (FR-005), moedas somam pontos e a colisão termina a corrida

### Implementation for User Story 1

- [X] T020 [P] [US1] Implementar `src/core/lanes.js`: 3 faixas (índices 0 a 2) limitadas nas extremidades, ações `run | jump | slide` exclusivas, duração de pulo e deslize vindas de `balance.json`
- [X] T021 [P] [US1] Implementar `src/core/collision.js`: colisão por faixa e ação conforme obstáculo `low` (pular) ou `high` (deslizar) ou `blocker` (exige trocar de faixa), retornando o resultado do choque
- [X] T022 [P] [US1] Implementar `src/core/score.js`: pontos por moeda de `balance.json` e atualização da melhor pontuação
- [X] T023 [P] [US1] Criar `src/config/cities.json` com a entrada de Brasília (`id: brasilia`, `order: 1`, `palette` com no máximo 16 cores, obstáculos `low`: cones de obra e `high`: faixas e tapumes, `blocker`: jornalistas e carros oficiais, coletáveis: moedas, `lengthMeters: 1000`, `catchable: false`)
- [X] T024 [US1] Implementar `src/core/spawner.js`: gerar obstáculos e moedas de Brasília ao longo da pista com `src/core/rng.js` e `cities.json`, incluindo os personagens Guarda de segurança e Jornalista como obstáculos `blocker` que atrapalham a pista (FR-011), garantindo caminho livre (depende de T018, T023)
- [X] T025 [US1] Implementar `src/core/run.js`: estado da corrida (`cityId`, `state`, `speed`, `lane`, `action`, `energy` = 1 no MVP, `score`, `metersRun`), `tick()` com a velocidade subindo com o tempo, aplicar comandos, colisões e coleta (depende de T020, T021, T022, T024)
- [X] T026 [P] [US1] Implementar `src/input/keyboard.js` convertendo setas em `LEFT`, `RIGHT`, `JUMP`, `SLIDE` e `Esc`/`P` em `PAUSE`, conforme `contracts/input-commands.md`
- [X] T027 [P] [US1] Criar sprites provisórios de pixel art em `src/assets/sprites/` (Chico com 4 quadros de corrida, pulo e deslize; cone, faixa, jornalista com 2 quadros, guarda com 2 quadros, moeda) e registrar a origem de cada arquivo em `src/assets/LICENSES.md`
- [X] T028 [P] [US1] Criar o fundo de Brasília em `src/assets/backgrounds/brasilia/` com 3 camadas de paralaxe (Eixo Monumental, Congresso e Esplanada) e a pista, com no máximo 16 cores, e registrar em `src/assets/LICENSES.md`
- [X] T029 [US1] Implementar `src/scenes/TitleScene.js`: logotipo com fonte pixelada, botão de iniciar, melhor pontuação guardada via `src/platform/storage.js` (FR-001, FR-019)
- [X] T030 [US1] Implementar `src/scenes/RunScene.js`: desenha pista, fundo com paralaxe e sprites animados lendo `src/config/characters.js`, ligando teclado a `run.js`, com tique de passo fixo de `src/core/clock.js` e pontuação no canto superior esquerdo (depende de T025, T026, T027, T028)
- [X] T031 [US1] Implementar `src/scenes/PauseScene.js` e ligar `PAUSE` do teclado e de `src/platform/lifecycle.js` para pausar e retomar a corrida (FR-018)
- [X] T032 [US1] Implementar `src/scenes/ResultScene.js` com a pontuação final, a melhor pontuação e a opção de jogar de novo; gravar a melhor pontuação ao fim da corrida (FR-019)

**Checkpoint**: A história 1 funciona sozinha e é testável (`npm test` e jogo no navegador)

---

## Phase 4: User Story 2 - Chegar perto de Caio no confronto do avião (Priority: P2)

**Goal**: Caio foge à frente de Chico; a distância muda conforme as regras da spec; no fim da fase vem o confronto do avião, em que Caio sempre escapa se o jogador chegou perto, e o jogador perde se não chegou.

**Independent Test**: Jogar Brasília até o fim; a barra de distância reage às moedas e colisões; ao fim da pista de embarque, a fase é vencida com Caio fugindo (distância dentro do limite) ou a corrida é perdida.

### Tests for User Story 2 ⚠️

- [X] T033 [P] [US2] Teste de distância em `tests/unit/chase.test.js`: diminui em ritmo constante, moeda a diminui em `coinDistanceBonus`, colisão a aumenta em `collisionDistancePenalty`, nunca fica negativa, e quanto mais perto Chico chega, mais rápido Caio foge
- [X] T034 [P] [US2] Teste do confronto do avião em `tests/unit/boss.test.js`: com `catchable: false`, distância dentro de `minVictoryDistance` ao fim da pista vence com Caio fugindo; distância acima perde; com `catchable: true`, só vence se a distância chegar a zero antes do fim da pista
- [X] T035 [P] [US2] Teste de integração em `tests/integration/run-boss.test.js`: corrida simulada de Brasília inteira até o fim da pista de embarque, nos dois desfechos (fase vencida e derrota)

### Implementation for User Story 2

- [X] T036 [US2] Implementar `src/core/chase.js`: `distanceToTarget` ≥ 0 que diminui sozinha em ritmo constante, diminui ao coletar moeda e aumenta a cada colisão, e acelera a fuga de Caio conforme Chico se aproxima (FR-009)
- [X] T037 [US2] Estender `src/core/run.js` com o estado `inBossRunway` nos últimos metros da cidade, velocidade máxima na pista de embarque e o desfecho `won`/`lost` de FR-010 usando `catchable` e `minVictoryDistance` (depende de T036)
- [X] T038 [P] [US2] Criar sprites de Caio (4 quadros de corrida, queda, embarque) e do avião em `src/assets/sprites/` e registrar a origem em `src/assets/LICENSES.md`
- [X] T039 [US2] Atualizar `src/scenes/RunScene.js` com a barra de distância até Caio no topo (FR-008), Caio animado à frente, a pista de embarque e a animação de Caio entrando no avião
- [X] T040 [US2] Atualizar `src/scenes/ResultScene.js` e `src/config/i18n/pt.json` com a tela de fase vencida em que Caio escapou por pouco (no MVP, indicando que a perseguição continua) e a tela de derrota

**Checkpoint**: Histórias 1 e 2 funcionam; o MVP de Brasília está completo

---

## Phase 5: User Story 3 - Energia, vidas e power-ups (Priority: P3)

**Goal**: Energia em dois níveis, 3 vidas, power-ups (bandeira, cartaz, mala de dinheiro) e vida extra por faixa presidencial ou por pontos.

**Independent Test**: Provocar uma colisão (a corrida continua com menos energia), coletar cada item e ver o efeito e a duração, perder corridas até acabarem as vidas e ver o jogo voltar a Brasília com 3 vidas.

### Tests for User Story 3 ⚠️

- [X] T041 [P] [US3] Teste de energia em `tests/unit/energy.test.js`: primeira colisão tira um nível e a segunda encerra a corrida; escudo ativo absorve a colisão e é consumido
- [X] T042 [P] [US3] Teste de power-ups em `tests/unit/powerups.test.js`: bandeira dá escudo de 8 s, cartaz dá velocidade extra de 5 s, mala de dinheiro reduz a distância em 50 m imediatamente, item igual ativo renova a duração sem acumular
- [X] T043 [P] [US3] Teste de vidas em `tests/unit/progress.test.js`: 3 vidas no início, perder corrida desconta uma e mantém a cidade, na última vida volta a `brasilia` com 3 vidas, faixa presidencial e `extraLifeScore` dão vida extra
- [X] T044 [P] [US3] Teste de integração em `tests/integration/lives.test.js`: sequência de derrotas até o fim das vidas e persistência de cidade e vidas em `src/platform/storage.js`

### Implementation for User Story 3

- [X] T045 [US3] Estender `src/core/collision.js` e `src/core/run.js` para energia de 2 níveis (`energy` inteiro 0 a 2) na versão completa, mantendo o modo de colisão única do MVP selecionável por configuração em `balance.json`
- [X] T046 [P] [US3] Implementar `src/core/powerups.js`: bandeira (escudo 8 s), cartaz de campanha (velocidade extra 5 s), mala de dinheiro (Caio cai, 50 m a menos), temporizadores que renovam e não acumulam
- [X] T047 [P] [US3] Implementar `src/core/progress.js`: 3 vidas, descontar vida ao perder, voltar a `brasilia` com 3 vidas ao zerar, vida extra pela faixa presidencial e ao atingir `extraLifeScore`, e gravar `cityReached` e `lives` via `src/platform/storage.js` (FR-023, FR-024, FR-025)
- [X] T048 [US3] Estender `src/core/spawner.js` para gerar bandeiras, cartazes, malas de dinheiro e a faixa presidencial a cada `presidentialSashEveryMeters`
- [X] T049 [P] [US3] Criar sprites de bandeira, cartaz de campanha, mala de dinheiro e faixa presidencial em `src/assets/sprites/` e registrar a origem em `src/assets/LICENSES.md`
- [X] T050 [US3] Atualizar `src/scenes/RunScene.js` com a energia no HUD (parte inferior), vidas restantes, efeitos visuais de escudo e velocidade extra
- [X] T051 [US3] Atualizar `src/scenes/ResultScene.js` e `src/config/i18n/pt.json` com a perda de vida, o recomeço na cidade atual e a tela de voltar ao início quando as vidas acabam

**Checkpoint**: Histórias 1 a 3 funcionam de forma independente

---

## Phase 6: User Story 4 - Percorrer as quatro cidades (Priority: P4)

**Goal**: Brasília, Assunção, Buenos Aires e Washington, cada uma com visual próprio; Caio só é preso no avião de Washington, e a vitória final conclui o jogo.

**Independent Test**: Jogar cada cidade e conferir paleta, fundo, obstáculos e coletáveis próprios, a transição para a próxima cidade e a prisão de Caio em Washington.

### Tests for User Story 4 ⚠️

- [X] T052 [P] [US4] Teste de configuração das cidades em `tests/unit/cities.test.js`: quatro cidades, `order` único de 1 a 4, `palette` com no máximo 16 cores, `catchable` verdadeiro só em Washington
- [X] T053 [P] [US4] Teste de integração em `tests/integration/campaign.test.js`: campanha simulada Brasília a Washington, avanço de cidade ao vencer, prisão de Caio só em Washington e término do jogo

### Implementation for User Story 4

- [X] T054 [US4] Completar `src/config/cities.json` com Assunção (paralelepípedo, palmeiras, rio; barracas de feira, motos, cercas; bandeiras e garrafas de tereré), Buenos Aires (Avenida 9 de Julho, obelisco; bondes, bancas de jornal, carros anos 70; moedas e discos de vinil) e Washington (Cúpula, sirenes, táxis amarelos; viaturas, seguranças, cercas de metal; notas de dólar e bandeiras, `catchable: true`), cada uma com no máximo 16 cores
- [X] T055 [P] [US4] Criar fundos de 3 camadas de paralaxe e pista de cada cidade em `src/assets/backgrounds/assuncao/`, `buenos-aires/` e `washington/`, e registrar a origem em `src/assets/LICENSES.md`
- [X] T056 [P] [US4] Criar sprites dos obstáculos e coletáveis de Assunção, Buenos Aires e Washington em `src/assets/sprites/` e registrar a origem em `src/assets/LICENSES.md`
- [X] T057 [US4] Estender `src/core/spawner.js` e `src/core/run.js` para ler obstáculos, coletáveis, comprimento e `catchable` da cidade atual de `cities.json`
- [X] T058 [US4] Implementar a transição de cidade em `src/core/progress.js` e `src/scenes/ResultScene.js`: fase vencida leva à cidade seguinte; recomeço da cidade atual ao perder (FR-013)
- [X] T059 [P] [US4] Criar `src/config/i18n/es.json` e `src/config/i18n/en.json` com os textos das cidades estrangeiras e estender `src/i18n.js` para escolher o idioma (FR-020)
- [X] T060 [US4] Implementar a prisão de Caio e a tela de vitória final em `src/scenes/ResultScene.js` e `src/core/run.js`, com a opção de recomeçar do início

**Checkpoint**: As quatro cidades jogáveis do início ao fim

---

## Phase 7: User Story 5 - Jogar no navegador e no celular (Priority: P5)

**Goal**: Mesma experiência com teclado no computador e com gestos de toque no celular, tela responsiva e empacotamento para Android e iPhone.

**Independent Test**: Completar uma corrida em um navegador de computador (setas) e em um navegador de celular (gestos), girar a tela e minimizar o navegador; depois abrir o aplicativo empacotado em Android e iPhone.

### Tests for User Story 5 ⚠️

- [X] T061 [P] [US5] Teste de gestos em `tests/unit/touch.test.js`: arrastar para os lados gera `LEFT`/`RIGHT`, deslizar para cima gera `JUMP`, para baixo gera `SLIDE`, e movimentos menores que `swipeMinPixels` são ignorados
- [X] T062 [P] [US5] Teste de fumaça com Playwright em `tests/smoke/game.spec.js`: abrir o jogo, iniciar uma corrida, enviar comandos de teclado por alguns segundos e verificar que não há erros de console (computador e viewport de celular)

### Implementation for User Story 5

- [X] T063 [US5] Implementar `src/input/touch.js` convertendo gestos em `LEFT`, `RIGHT`, `JUMP`, `SLIDE` com `swipeMinPixels` de `balance.json` e ligar a `src/scenes/RunScene.js`
- [X] T064 [US5] Adicionar botão de pausa na tela, visível em dispositivos de toque, em `src/scenes/RunScene.js` e `src/scenes/PauseScene.js`
- [X] T065 [US5] Tornar o layout responsivo em `src/main.js` e `index.html`: reajustar a área de jogo ao mudar de tamanho ou orientação, manter a proporção 16:9 com pixels nítidos, respeitar áreas seguras e manter o HUD visível em retrato e paisagem (FR-014, SC-008)
- [X] T066 [P] [US5] Criar `public/manifest.webmanifest` e ícones em `public/icons/` para instalação como PWA, e registrar a origem dos ícones em `src/assets/LICENSES.md`
- [X] T067 [US5] Adicionar o Capacitor: criar `capacitor.config.json` apontando para a pasta `dist`, instalar `@capacitor/core` e `@capacitor/cli`, e gerar `android/` e `ios/` com `npx cap add android` e `npx cap add ios`
- [X] T068 [US5] Documentar em `README.md` o fluxo `npm run build`, `npx cap sync` e `npx cap open` para Android e iPhone, incluindo que o build para iPhone exige macOS com Xcode
- [ ] T069 [US5] Executar o playtest manual do cenário 5 do `quickstart.md` em um navegador de celular, em um aparelho Android e em um iPhone, e registrar o resultado em `specs/001-corrida-do-planalto/checklists/mobile-playtest.md` **Pendente**: precisa de aparelhos reais; parte automática e roteiro em `checklists/mobile-playtest.md`.

**Checkpoint**: Todas as histórias funcionam em computador e celular

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Melhorias que afetam várias histórias

- [X] T070 [P] Compor a trilha sonora chiptune no BeepBox e os efeitos sonoros (pulo, moeda, colisão, power-up, vida extra), salvar em `src/assets/audio/`, registrar origem e licença em `src/assets/LICENSES.md`
- [X] T071 Implementar `src/platform/audio.js`: iniciar o áudio só após o primeiro toque ou tecla, botão de silenciar na tela e preferência `soundOn` guardada em `src/platform/storage.js` (FR-015)
- [X] T072 [P] Tratar os casos-limite da spec em `src/core/` e `src/scenes/`: comandos simultâneos, `JUMP`/`SLIDE` durante outra ação, colisão no instante em que o escudo termina, mudança de orientação durante a corrida, e atributos de personagem ausentes ou inválidos, com testes em `tests/unit/edge-cases.test.js`
- [X] T073 Revisar os ativos e o conteúdo conforme FR-021: nenhum político real, logotipo de partido ou imagem protegida; revisar bandeiras, símbolos de países e monumentos; registrar o resultado em `specs/001-corrida-do-planalto/checklists/legal-review.md`
- [ ] T074 Verificar as metas de desempenho (60 quadros por segundo, resposta em menos de 100 ms, título em menos de 10 s) em computador e em celular de gama média, e registrar em `specs/001-corrida-do-planalto/checklists/performance.md` **Pendente**: medido em Chromium (60 fps, título em menos de 2 s); falta o celular real, ver `checklists/performance.md`.
- [X] T075 Verificar o balanceamento em playtest: partida de Brasília entre 2 e 4 minutos (SC-005) e ajustar `src/config/balance.json`
- [X] T076 [P] Revisar acessibilidade (não depender só de cor, controles comunicados na tela de título) em `src/scenes/TitleScene.js` e `src/scenes/PauseScene.js`
- [X] T077 [P] Limpeza e refatoração do código e execução final de `npm run lint` e `npm test`
- [ ] T078 Executar todos os cenários de validação de `specs/001-corrida-do-planalto/quickstart.md` e corrigir o que falhar **Pendente**: cenários 1 a 4, 6 e 7 verificados por testes e no navegador; o 5 depende de T069.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências; começa imediatamente
- **Foundational (Phase 2)**: Depende do Setup; BLOQUEIA todas as histórias
- **User Stories (Phase 3 a 7)**: Dependem da fase Foundational
  - Em ordem de prioridade (P1 → P2 → P3 → P4 → P5), ou em paralelo se houver pessoas
- **Polish (Phase 8)**: Depende das histórias desejadas

### User Story Dependencies

- **US1 (P1)**: Depois da Foundational; sem dependência de outras histórias
- **US2 (P2)**: Depois da Foundational; estende `run.js` e `RunScene.js` da US1 e por isso é mais simples depois da US1
- **US3 (P3)**: Depois da US1; a energia estende a colisão da US1, e os power-ups usam a distância da US2 (mala de dinheiro)
- **US4 (P4)**: Depois da US2 e da US3 (precisa do confronto do avião, de vidas e de progresso)
- **US5 (P5)**: Os gestos de toque e o layout podem começar depois da US1; o empacotamento (T067 a T069) deve esperar o jogo estável nas histórias anteriores

### Within Each User Story

- Testes escritos primeiro, e devem FALHAR antes da implementação
- Lógica pura (`src/core`) antes das cenas (`src/scenes`)
- Ativos (sprites, fundos) em paralelo com a lógica
- História completa antes de passar para a próxima prioridade

### Parallel Opportunities

- Tarefas [P] do Setup (T002 a T004) e da Foundational (T006 a T013)
- Todos os testes de uma história (T015 a T019, T033 a T035, T041 a T044, T052 e T053, T061 e T062)
- Em US1: T020 a T023, T026 a T028 em paralelo, por serem arquivos diferentes
- Ativos de arte (T027, T028, T038, T049, T055, T056) podem ser feitos em paralelo com a lógica

---

## Parallel Example: User Story 1

```bash
# Testes da história 1 juntos:
Task: "Teste de faixas em tests/unit/lanes.test.js"
Task: "Teste de colisão em tests/unit/collision.test.js"
Task: "Teste de pontuação em tests/unit/score.test.js"
Task: "Teste do gerador de obstáculos em tests/unit/spawner.test.js"

# Lógica e arte da história 1 juntas:
Task: "Implementar src/core/lanes.js"
Task: "Implementar src/core/collision.js"
Task: "Implementar src/core/score.js"
Task: "Criar sprites provisórios em src/assets/sprites/"
```

---

## Implementation Strategy

### MVP First (User Stories 1 e 2: Brasília)

1. Completar a Phase 1: Setup
2. Completar a Phase 2: Foundational (bloqueia tudo)
3. Completar a Phase 3: História 1
4. Completar a Phase 4: História 2 (fecha o MVP de Brasília, conforme a spec)
5. **PARAR e VALIDAR**: jogar Brasília inteira no navegador e rodar `npm test`
6. Mostrar a demonstração se estiver pronto

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → testar sozinha (corrida jogável)
3. US2 → testar (MVP de Brasília completo)
4. US3 → testar (energia, vidas e power-ups)
5. US4 → testar (quatro cidades)
6. US5 → testar (celular e empacotamento)
7. Cada história acrescenta valor sem quebrar as anteriores

### Parallel Team Strategy

Com mais de uma pessoa: concluir Setup e Foundational juntos; depois uma pessoa faz a lógica (`src/core`), outra a arte (sprites e fundos) e outra as cenas e a entrada; as histórias se integram ao fim de cada fase.

---

## Notes

- [P] = arquivos diferentes, sem dependências
- [Story] liga a tarefa à história para rastrear
- Cada história deve poder ser concluída e testada de forma independente
- Confirmar que os testes falham antes de implementar
- Fazer commit depois de cada tarefa ou grupo lógico
- Parar em qualquer checkpoint para validar a história sozinha
- Evitar tarefas vagas, conflitos no mesmo arquivo e dependências entre histórias que quebrem a independência
