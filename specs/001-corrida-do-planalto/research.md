# Research: Corrida do Planalto

Todas as incógnitas do Technical Context foram resolvidas abaixo. As versões exatas das
dependências são fixadas no `package.json` na criação do projeto.

## 1. Motor de jogo

- **Decision**: Phaser 3 (linha 3.x).
- **Rationale**: motor 2D em JavaScript, maduro, com suporte nativo a pixel art (`pixelArt: true`,
  escala `FIT`), animação por quadros, paralaxe, entrada por toque e teclado e áudio. Roda em
  navegador sem instalação e funciona dentro do Capacitor. A spec de origem já o sugere.
- **Alternatives considered**: Canvas puro (menos código de terceiros, mas exigiria escrever
  animação, áudio e escala à mão, contra o princípio de simplicidade); PixiJS (só renderização,
  faltaria entrada, áudio e cenas); Kaboom/Kaplay (menor ecossistema para empacotamento mobile).

## 2. Ferramenta de build e como abrir o jogo

- **Decision**: Vite para desenvolvimento e build; o build gera uma pasta estática com caminhos
  relativos, servível por qualquer servidor de arquivos.
- **Rationale**: a Constituição pede arquivos estáticos e dispensa servidor próprio. Módulos ES não
  carregam por `file://` em vários navegadores, então "abrir o `index.html`" direto não é
  garantido; "servir a pasta estática" é suficiente e permitido pela Constituição.
- **Alternatives considered**: scripts clássicos sem build (funciona em `file://`, mas perde
  módulos e testes simples); Webpack/Parcel (mais configuração, sem ganho).

## 3. Testes

- **Decision**: Vitest para a lógica pura e para corridas simuladas; Playwright para um teste de
  fumaça no navegador.
- **Rationale**: a lógica do jogo fica em módulos puros, então testes rápidos em Node cobrem
  regras de faixa, colisão, distância, vidas e power-ups. O teste de fumaça garante que o jogo
  carrega e roda sem erros. Sensação de jogo e UX ficam no playtest manual, como pede a
  Constituição.
- **Alternatives considered**: Jest (configuração extra com módulos ES); testes só manuais
  (insuficiente para lógica de regras).

## 4. Armazenamento local

- **Decision**: `localStorage`, por trás de `platform/storage.js`, com chave versionada.
- **Rationale**: o dado é pequeno (recorde, cidade, vidas, som) e funciona no navegador e no
  Capacitor. A camada fina permite trocar por outro armazenamento sem mudar a lógica. Em modo
  privado ou com o armazenamento bloqueado, o jogo continua sem guardar.
- **Alternatives considered**: IndexedDB (exagero para quatro valores); plugin nativo de
  preferências do Capacitor (só se `localStorage` se mostrar instável no mobile).

## 5. Entrada: teclado e toque

- **Decision**: converter teclado (setas) e gestos de toque (arrastar e deslizar) em um conjunto
  único de comandos (`LEFT`, `RIGHT`, `JUMP`, `SLIDE`, `PAUSE`), definido em
  [contracts/input-commands.md](contracts/input-commands.md). A lógica só recebe comandos.
- **Rationale**: mantém os mesmos controles em todas as plataformas e deixa a lógica testável sem
  teclado ou tela.
- **Alternatives considered**: botões na tela (ocupam espaço em tela pequena, contra a spec que
  pede gestos).

## 6. Tempo fixo e determinismo

- **Decision**: a lógica avança em passos de tempo fixos (60 por segundo), independentes da taxa
  de quadros da tela; a geração de obstáculos usa um gerador pseudoaleatório com semente.
- **Rationale**: o jogo se comporta igual em telas de 60 e 120 Hz e permite reproduzir corridas
  inteiras nos testes de integração.
- **Alternatives considered**: tempo variável por quadro (comportamento diferente por aparelho,
  testes não determinísticos).

## 7. Áudio

- **Decision**: trilha chiptune criada no BeepBox (ferramenta gratuita) e exportada em formato
  compacto; efeitos curtos gerados com uma ferramenta gratuita de efeitos retrô. Áudio só começa
  depois do primeiro toque ou tecla, por exigência dos navegadores.
- **Rationale**: atende ao estilo pedido sem custo de licença. Registro de origem e licença em
  `src/assets/LICENSES.md`, como exige a Constituição.
- **Alternatives considered**: bibliotecas de música livres de terceiros (exigiriam revisão de
  licença para cada faixa).

## 8. Idiomas

- **Decision**: arquivos JSON por idioma (`pt`, `es`, `en`) com chaves de texto; português por
  padrão; os textos das cidades estrangeiras existem em espanhol e inglês conforme a spec.
- **Rationale**: simples, sem biblioteca de internacionalização.
- **Alternatives considered**: biblioteca i18n completa (excesso para o volume de textos).

## 9. Empacotamento para Android e iPhone

- **Decision**: Capacitor, usando o mesmo build estático, na última fase do projeto. Pausa
  automática ao ir para segundo plano via eventos de visibilidade da página, também válidos no
  Capacitor.
- **Rationale**: não exige reescrever a lógica do jogo, atende ao princípio IV. Build iOS exige
  macOS com Xcode, o que é uma dependência de ambiente a registrar.
- **Alternatives considered**: PWA instalável apenas (mais simples, mas sem presença em lojas;
  pode ser feito antes, como etapa intermediária, sem custo); Cordova (comunidade menor que a do
  Capacitor).

## 10. Balanceamento e valores iniciais

- **Decision**: valores de balanceamento ficam em `src/config/balance.json`, fora do código, com
  valores iniciais estimados e ajustados por playtest: ritmo de redução da distância, ganho por
  moeda, penalidade por colisão, distância mínima de vitória nas três primeiras cidades, pontos
  da vida extra e frequência da faixa presidencial.
- **Rationale**: a spec deixa esses números para o balanceamento; separá-los permite ajustar sem
  mexer em lógica.
- **Alternatives considered**: constantes no código (cada ajuste exigiria mudar e testar o
  código).
