# Feature Specification: Corrida do Planalto

**Feature Branch**: `001-corrida-do-planalto`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "O Projeto está especificado no artifact https://claude.ai/artifact/NHoKGpyjRJdGPMNGvrPAE7" (doc "Spec: Corrida do Planalto")

## Clarifications

### Session 2026-11-07

- Q: Como funciona o confronto final do avião? → A: Mesma corrida de três faixas e mesmos controles; nos últimos metros a velocidade fica no máximo, e Chico vence se a distância até Caio chegar a zero antes de a pista de embarque acabar.
- Q: O que faz a distância até Caio diminuir ou aumentar? → A: Diminui sozinha em ritmo constante e fica menor ao coletar moedas; cada colisão a aumenta; a mala de dinheiro tira 50 metros.
- Q (ajuste do usuário à resposta anterior): Caio é pego ao fim de toda fase? → A: Não. Nas três primeiras cidades, mesmo que Chico chegue bem perto, Caio sempre entra no avião e foge; Chico só prende Caio no avião de Washington, a última fase.
- Q: Ao perder uma corrida em uma cidade avançada, o jogador recomeça de onde? → A: Do início da cidade em que perdeu. O jogador tem 3 vidas; ao perder a corrida, perde uma vida; ao acabarem as vidas, o jogo volta ao início (Brasília). Uma vida extra vem de um item especial (faixa presidencial) ou de atingir um valor de pontos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correr e desviar em Brasília (Priority: P1)

O jogador abre o jogo, inicia a corrida e controla Chico do Planalto em uma pista de três faixas,
em Brasília. Chico corre sozinho para a frente. O jogador troca de faixa, pula obstáculos baixos
(cones, cercas, carrinhos), desliza sob barreiras altas (faixas, tapumes) e coleta moedas que somam
pontos. Bater em um obstáculo encerra a corrida e mostra a pontuação final, com opção de jogar de
novo.

**Why this priority**: É o núcleo do jogo. Sozinha, essa história já entrega uma partida jogável
do início ao fim e permite avaliar a sensação de controle e de ritmo.

**Independent Test**: Iniciar uma corrida, trocar de faixa, pular, deslizar e coletar moedas até
bater em um obstáculo; verificar que a pontuação sobe com as moedas e que a tela de fim de jogo
aparece com a pontuação e a opção de recomeçar.

**Acceptance Scenarios**:

1. **Given** a corrida em andamento, **When** o jogador troca de faixa, **Then** Chico se move
   para a faixa vizinha na direção escolhida; na faixa da extremidade, o comando para fora da
   pista não tem efeito.
2. **Given** um obstáculo baixo à frente, **When** o jogador pula no momento certo, **Then** Chico
   passa por cima sem colidir.
3. **Given** uma barreira alta à frente, **When** o jogador desliza no momento certo, **Then**
   Chico passa por baixo sem colidir.
4. **Given** uma moeda na faixa de Chico, **When** Chico passa por ela, **Then** a moeda
   desaparece e a pontuação aumenta.
5. **Given** a corrida em andamento, **When** Chico colide com um obstáculo, **Then** a corrida
   termina e aparece a pontuação final com a opção de jogar novamente.
6. **Given** a corrida em andamento, **When** o tempo passa, **Then** a velocidade da pista
   aumenta gradualmente.

---

### User Story 2 - Chegar perto de Caio no confronto do avião (Priority: P2)

Durante a corrida, Caio Herdeiro foge à frente de Chico. Uma barra de distância no topo da tela
mostra o quanto falta para alcançá-lo. A distância diminui sozinha em ritmo constante e fica menor
quando Chico coleta moedas; cada colisão a aumenta. No fim de cada fase, Caio corre para um avião.
Nas três primeiras cidades, se Chico chegar bem perto (dentro da distância mínima de vitória), a
fase é vencida, mas Caio sempre entra no avião e foge, dando a sensação de que quase foi preso. Se
Chico não chegar perto o bastante, a corrida termina em derrota. Só na última fase (Washington)
Chico consegue prender Caio.

**Why this priority**: Dá objetivo e fim à corrida. Sem ela o jogo é só uma corrida infinita;
com ela a partida tem vitória e derrota claras.

**Independent Test**: Jogar a fase de Brasília até o fim e verificar a barra de distância, a
cena do avião e as duas saídas possíveis (fase vencida com Caio fugindo, ou derrota por não chegar
perto o bastante).

**Acceptance Scenarios**:

1. **Given** a corrida em andamento, **When** o tempo passa, **Then** a distância até Caio
   diminui em ritmo constante e a barra no topo reflete a distância atual.
2. **Given** a corrida em andamento, **When** Chico coleta uma moeda, **Then** a distância até
   Caio diminui; **When** colide com um obstáculo, **Then** a distância aumenta.
   Quanto mais perto Chico chega, mais rápido Caio foge, e a velocidade da corrida acompanha a
   proximidade.
3. **Given** a fase final de Brasília, **When** Caio chega à pista de embarque do avião, **Then**
   começa o confronto final: a mesma corrida de três faixas, com os mesmos controles, em
   velocidade máxima até o fim da pista de embarque.
4. **Given** o confronto final de Brasília, Assunção ou Buenos Aires, **When** a pista de embarque
   acaba com a distância até Caio dentro da distância mínima de vitória, **Then** Caio entra no
   avião e foge, e a fase é vencida com uma tela que mostra que ele escapou por pouco.
5. **Given** o confronto final de Brasília, Assunção ou Buenos Aires, **When** a pista de embarque
   acaba com a distância maior que a distância mínima de vitória, **Then** a corrida termina em
   derrota.
6. **Given** o confronto final de Washington, **When** a distância até Caio chega a zero antes de
   a pista de embarque acabar, **Then** Chico prende Caio e o jogo termina em vitória.
7. **Given** o confronto final de Washington, **When** a pista de embarque acaba com a distância
   maior que zero, **Then** a corrida termina em derrota.

---

### User Story 3 - Energia, vidas e power-ups (Priority: P3)

Na versão completa, a primeira colisão tira um nível de energia em vez de encerrar a corrida, e a
segunda encerra a corrida. Cada corrida perdida custa uma das 3 vidas do jogador, que então
recomeça do início da cidade em que perdeu. Quando as vidas acabam, o jogo volta ao início
(Brasília). O jogador ganha uma vida extra ao coletar um item especial (a faixa presidencial) ou ao
atingir um valor de pontos. Além das moedas, Chico coleta itens com efeito: a bandeira cria um
escudo que protege de uma colisão (8 s), o cartaz de campanha dá velocidade extra (5 s) e a mala
de dinheiro derruba Caio e dá a Chico 50 metros de vantagem (instantâneo).

**Why this priority**: Acrescenta profundidade e recuperação de erros, mas o jogo funciona sem
isso.

**Independent Test**: Provocar uma colisão e ver que a corrida continua com menos energia;
coletar cada item e verificar seu efeito e duração; provocar uma segunda colisão e ver o fim da
corrida.

**Acceptance Scenarios**:

1. **Given** energia cheia, **When** Chico colide com um obstáculo, **Then** perde um nível de
   energia e a corrida continua.
2. **Given** energia no último nível, **When** Chico colide, **Then** a corrida termina.
3. **Given** que Chico coletou uma bandeira, **When** colide durante os 8 segundos do escudo,
   **Then** nenhum nível de energia é perdido e o escudo é consumido.
4. **Given** que Chico coletou um cartaz de campanha, **When** passam 5 segundos, **Then** a
   velocidade extra termina.
5. **Given** que Chico coletou uma mala de dinheiro, **When** o item é coletado, **Then** Caio cai
   e a distância até ele diminui em 50 metros imediatamente.
6. **Given** que o jogador ainda tem vidas, **When** a corrida termina em derrota, **Then** uma
   vida é descontada e a corrida recomeça do início da cidade em que o jogador perdeu.
7. **Given** que o jogador está na última vida, **When** a corrida termina em derrota, **Then** o
   jogo volta ao início (Brasília) e o jogador recebe 3 vidas novas.
8. **Given** que Chico coletou a faixa presidencial, **When** o item é coletado, **Then** o
   jogador ganha uma vida extra.
9. **Given** que a pontuação atinge o valor definido para vida extra, **When** o limite é
   cruzado, **Then** o jogador ganha uma vida extra.

---

### User Story 4 - Percorrer as quatro cidades (Priority: P4)

Na versão completa, a perseguição passa por Brasília, Assunção, Buenos Aires e Washington, nessa
ordem. Cada cidade tem paleta, fundo, obstáculos e coletáveis próprios e termina com seu confronto
do avião. Ao vencer a fase de uma cidade (com Caio fugindo de avião), o jogador segue para a próxima;
prender Caio no avião de Washington conclui o jogo.

**Why this priority**: Amplia o conteúdo reaproveitando a mesma mecânica; depende das histórias
anteriores.

**Independent Test**: Jogar cada cidade e verificar a identidade visual, os obstáculos e
coletáveis temáticos e a transição para a próxima cidade após o avião.

**Acceptance Scenarios**:

1. **Given** a fase vencida em Brasília, Assunção ou Buenos Aires (com Caio fugindo de avião),
   **When** a tela de fase vencida é dispensada, **Then** a corrida da cidade seguinte começa.
2. **Given** qualquer cidade, **When** a corrida está em andamento, **Then** a pista, o fundo, os
   obstáculos e os coletáveis correspondem ao cenário daquela cidade.
3. **Given** a prisão de Caio no avião de Washington, **When** a tela é exibida, **Then** o jogo
   mostra o encerramento e permite recomeçar do início.

---

### User Story 5 - Jogar no navegador e no celular (Priority: P5)

O jogador abre o jogo direto no navegador, sem instalar nada, no computador ou no celular. No
celular, joga com toque: arrastar para trocar de faixa, deslizar para cima para pular e para baixo
para deslizar. No computador, usa as setas. O jogo também pode ser distribuído como aplicativo para
Android e iPhone com o mesmo conteúdo e comportamento.

**Why this priority**: Controles em teclado e toque são necessários para a experiência completa,
mas a distribuição como aplicativo vem depois do jogo funcionar no navegador.

**Independent Test**: Abrir o jogo em um navegador de computador e em um navegador de celular e
completar uma corrida em cada um usando apenas os controles do dispositivo.

**Acceptance Scenarios**:

1. **Given** um navegador de computador, **When** o jogador usa as setas, **Then** todos os
   movimentos (faixa, pulo, deslize) funcionam.
2. **Given** um celular com tela sensível ao toque, **When** o jogador arrasta ou desliza na tela,
   **Then** todos os movimentos funcionam.
3. **Given** telas de tamanhos e proporções diferentes, **When** o jogo é exibido, **Then** a área
   de jogo é escalada com pixels nítidos e toda a interface (HUD) permanece visível.
4. **Given** o jogo empacotado como aplicativo, **When** é aberto em Android ou iPhone, **Then**
   se comporta como na versão de navegador.

---

### Edge Cases

- O que acontece quando o jogador troca de faixa, pula ou desliza no mesmo instante? Os comandos
  são processados na ordem em que chegam, sem travar o jogo.
- O que acontece ao pular e deslizar em seguida, ou ao deslizar com uma ação já em andamento? O
  comando é aceito somente quando o personagem está livre para executá-lo, ou entra na fila por um
  intervalo curto.
- O que acontece quando o jogador coleta um power-up do mesmo tipo já ativo? A duração é
  renovada, sem acumular efeitos.
- O que acontece quando a colisão ocorre exatamente quando o escudo termina? Vale o estado do
  escudo no instante da colisão.
- O que acontece se a aba do navegador perde o foco ou o celular recebe uma chamada durante a
  corrida? O jogo pausa e retoma sem perder o progresso.
- O que acontece quando a tela muda de orientação ou de tamanho durante a corrida? A área de jogo
  se reajusta mantendo a proporção.
- O que acontece quando um nome ou um visual de personagem no arquivo de configuração está
  ausente ou inválido? O jogo usa um valor padrão e avisa, sem quebrar.
- O que acontece se o jogador quebra o recorde de pontuação? O novo recorde é guardado para as
  próximas partidas neste dispositivo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O jogo MUST apresentar uma tela de título com o logotipo e permitir iniciar uma
  corrida.
- **FR-002**: O jogo MUST exibir uma corrida contínua em pista de três faixas, na qual o
  personagem do jogador avança automaticamente, sem comando para frear.
- **FR-003**: O jogador MUST poder trocar de faixa para a esquerda e para a direita, pular e
  deslizar.
- **FR-004**: Obstáculos baixos (cones, cercas, carrinhos) MUST poder ser superados pulando e
  barreiras altas (faixas, tapumes) MUST poder ser superadas deslizando.
- **FR-005**: A velocidade da pista MUST aumentar gradualmente ao longo do tempo e conforme a
  proximidade de Caio.
- **FR-006**: Moedas MUST somar pontos ao serem coletadas, e a pontuação atual MUST ser exibida
  durante a corrida.
- **FR-007**: A colisão com um obstáculo MUST encerrar a corrida na versão inicial; na versão
  completa, a primeira colisão MUST tirar um nível de energia e a segunda MUST encerrar a corrida.
- **FR-008**: O jogo MUST exibir, durante a corrida, a pontuação (canto superior esquerdo), a
  energia (parte inferior) e a barra de distância até Caio (topo).
- **FR-009**: Caio MUST fugir à frente de Chico. A distância entre eles MUST diminuir sozinha em
  ritmo constante, diminuir ao coletar moedas e aumentar a cada colisão; quanto mais perto Chico
  chega, mais rápido Caio foge.
- **FR-010**: Ao fim de cada fase, o jogo MUST apresentar o confronto final do avião, na mesma
  corrida de três faixas e com os mesmos controles, em velocidade máxima, até o fim da pista de
  embarque. Em Brasília, Assunção e Buenos Aires, a fase é vencida se a distância até Caio estiver
  dentro da distância mínima de vitória ao fim da pista, e Caio MUST sempre entrar no avião e
  fugir; caso contrário, a corrida termina em derrota. Em Washington, Chico prende Caio se a
  distância chegar a zero antes de a pista de embarque acabar; caso contrário, a corrida termina
  em derrota.
- **FR-011**: Os personagens Guarda de segurança e Jornalista MUST aparecer como obstáculos que
  atrapalham ou bloqueiam a pista, conforme descrito no desenho do jogo.
- **FR-012**: Na versão completa, a bandeira MUST dar um escudo contra uma colisão por 8
  segundos, o cartaz de campanha MUST dar velocidade extra por 5 segundos, e a mala de dinheiro
  MUST derrubar Caio e dar 50 metros de vantagem imediatamente.
- **FR-023**: Na versão completa, o jogador MUST começar com 3 vidas; perder uma corrida MUST
  descontar uma vida e recomeçar a corrida do início da cidade em que o jogador perdeu; quando as
  vidas acabarem, o jogo MUST voltar ao início (Brasília) e restaurar as 3 vidas.
- **FR-024**: Na versão completa, o jogador MUST ganhar uma vida extra ao coletar a faixa
  presidencial ou ao atingir o valor de pontos definido para isso; as vidas restantes MUST ser
  exibidas durante a corrida.
- **FR-025**: O jogo MUST guardar no aparelho a cidade alcançada e as vidas restantes, de modo que
  o jogador continue de onde parou ao reabrir o jogo.
- **FR-013**: Na versão completa, o jogo MUST oferecer quatro cenários na ordem Brasília,
  Assunção, Buenos Aires e Washington, cada um com paleta, fundo, obstáculos e coletáveis
  próprios, conforme a tabela de cenários do desenho do jogo.
- **FR-014**: O jogo MUST usar pixel art de 16 bits em resolução nativa de 320 x 180, escalada
  para a tela com pixels nítidos, com no máximo 16 cores por cenário, fundo com três camadas de
  paralaxe e animações de corrida de 4 quadros para Chico e Caio e de 2 quadros para a guarda e o
  jornalista.
- **FR-015**: O jogo MUST tocar trilha sonora em estilo chiptune e permitir silenciar o som.
- **FR-016**: Os controles MUST funcionar por teclado (setas) e por toque (arrastar para trocar
  de faixa, deslizar para cima para pular, deslizar para baixo para deslizar).
- **FR-017**: Os nomes e os visuais dos personagens MUST ficar em um arquivo de configuração
  separado, de modo que trocar um nome ou um sprite não exija alterar a lógica do jogo.
- **FR-018**: O jogo MUST pausar automaticamente quando perde o foco e MUST permitir pausar e
  retomar manualmente.
- **FR-019**: O jogo MUST guardar a melhor pontuação do jogador no próprio dispositivo e exibi-la
  na tela de título e no fim da corrida.
- **FR-020**: Os textos do jogo MUST estar em português, com versões em espanhol e inglês para as
  cidades estrangeiras.
- **FR-021**: Todos os personagens, nomes, bandeiras e símbolos MUST ser fictícios ou
  originais, sem uso de políticos reais, logotipos de partidos ou imagens protegidas; a
  sátira não deve mirar um único campo político.
- **FR-022**: O jogo MUST poder ser aberto e jogado em navegador sem instalação e MUST poder ser
  distribuído como aplicativo para Android e iPhone com o mesmo comportamento.

### Key Entities *(include if feature involves data)*

- **Corrida**: uma partida em andamento; tem cidade atual, velocidade, pontuação, energia,
  distância até Caio e estado (em andamento, pausada, vencida, perdida).
- **Progresso do jogador**: vidas restantes e cidade alcançada, guardados no aparelho.
- **Personagem**: Chico do Planalto (jogador), Caio Herdeiro (alvo), Guarda de segurança e
  Jornalista (obstáculos); cada um tem nome, visual e animações definidos na configuração.
- **Cenário**: uma das quatro cidades, com pista, fundo em camadas, paleta, obstáculos e
  coletáveis temáticos, e seu confronto final do avião.
- **Obstáculo**: elemento da pista que exige pular, deslizar ou trocar de faixa; pode ser baixo ou
  alto.
- **Coletável**: moeda (pontos), power-up (bandeira, cartaz de campanha, mala de dinheiro) com
  efeito e duração, ou item especial (faixa presidencial) que dá uma vida extra.
- **Pontuação**: valor da corrida atual e melhor valor já alcançado no dispositivo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um novo jogador chega à primeira corrida em menos de 10 segundos depois de abrir o
  jogo, sem instalar nada.
- **SC-002**: 90% dos jogadores de teste completam, na primeira tentativa, uma troca de faixa, um
  pulo e um deslize corretos nos primeiros 60 segundos de jogo, sem ajuda.
- **SC-003**: A corrida se mantém fluida, a 60 quadros por segundo, em pelo menos 95% do tempo
  de jogo em aparelhos de gama média, tanto em computador quanto em celular.
- **SC-004**: O jogo responde a um comando do jogador em menos de 100 milissegundos, percebido
  como imediato.
- **SC-005**: Uma partida de Brasília, do início ao confronto do avião, dura entre 2 e 4 minutos
  para um jogador médio.
- **SC-006**: Trocar o nome ou o visual de um personagem exige alterar somente o arquivo de
  configuração, sem tocar na lógica do jogo, e a troca aparece no jogo na execução seguinte.
- **SC-007**: O jogo completa uma corrida inteira, com os mesmos controles disponíveis, em ao
  menos um navegador de computador e um navegador de celular, em Android e iPhone.
- **SC-008**: Toda a interface permanece visível e legível em telas de celular em retrato e
  paisagem e em telas de computador.

## Assumptions

- **Escopo do MVP**: o MVP é a fase de Brasília, com corrida, troca de faixa, pulo, deslize,
  moedas e o confronto do avião, para desktop e navegador. Power-ups, energia em dois níveis, as
  outras três cidades e a distribuição mobile entram na versão completa.
- **Colisão no MVP**: como o desenho define colisão em dois níveis só para a versão completa,
  no MVP uma única colisão encerra a corrida.
- **Conflito entre fases**: o desenho diz que a pista muda de cenário a cada 1.000 metros e
  também que cada cidade tem seu confronto do avião. Assume-se que cada cidade é uma fase de
  1.000 metros que termina com o seu avião.
- **Boss**: o desenho cita helicóptero ou avião; adota-se o avião, sem mecânica de jogo própria
  (ver Clarifications). Só o avião de Washington permite prender Caio.
- **Distância até Caio**: segue as regras de FR-009 (ver Clarifications). Os valores exatos, como
  o ritmo de redução, o ganho por moeda, a penalidade por colisão e a distância mínima de vitória
  das três primeiras cidades, são decididos no balanceamento.
- **Vidas**: o sistema de vidas só existe na versão completa; no MVP, perder a corrida permite
  recomeçar imediatamente. O valor de pontos da vida extra e a frequência da faixa presidencial
  são decididos no balanceamento.
- **Fim do MVP**: como o MVP tem só Brasília e Caio sempre foge nessa fase, uma fase vencida
  mostra a tela de Caio escapando por pouco, indicando que a perseguição continua, e permite
  recomeçar.
- **Pausa e recorde**: pausa, silenciar o som e o recorde local são padrões esperados de jogos
  deste tipo e foram assumidos, apesar de não constarem no desenho.
- **Plataforma e tecnologia**: seguem a Constituição do projeto (JavaScript, navegador primeiro,
  portabilidade para Android e iPhone). A escolha de motor de jogo, empacotamento e trilha sonora
  (o desenho sugere Phaser, Capacitor e BeepBox) é decidida no plano, e não nesta especificação.
- **Sem conta nem rede**: o jogo funciona offline depois de carregado, sem login nem servidor
  próprio, e guarda apenas o recorde local.
- **Idioma**: a interface é exibida em português por padrão; espanhol e inglês se aplicam aos
  textos das cidades estrangeiras.
- **Revisão legal**: bandeiras, símbolos de países e monumentos serão revisados antes da
  publicação, conforme os pontos de atenção do desenho.
