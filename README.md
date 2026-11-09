# Corrida do Planalto

Endless runner em pixel art de 16 bits, em retrato e com a câmera atrás do corredor (estilo Subway
Surfers): Chico persegue Caio por Brasília, Assunção, Buenos Aires e
Washington. Feito com Phaser 3 e Vite; roda no navegador e é empacotado para Android e iPhone com o
Capacitor, a partir do mesmo código.

A especificação, o plano e as tarefas estão em `specs/001-corrida-do-planalto/`.

## Rodar no navegador

Precisa de Node.js 20 LTS ou superior.

```bash
npm install
npm run dev        # servidor local de desenvolvimento
npm run build      # gera a pasta estática dist/
npm run preview    # serve a pasta dist/
```

Controles: setas (trocar de faixa, pular, deslizar) e Esc ou P (pausar). No celular: arrastar para
os lados, deslizar para cima (pular) ou para baixo (deslizar) e o botão de pausa na tela.

## Verificações

```bash
npm run lint         # ESLint e Prettier
npm test             # Vitest: unitários e corridas simuladas
npm run test:smoke   # Playwright: abre o jogo, joga alguns segundos (computador e celular)
```

O teste de fumaça usa o Chromium do Playwright. Na primeira vez, rode `npx playwright install
chromium`.

## Aplicativo para Android e iPhone

O aplicativo carrega o conteúdo da pasta `dist/`; por isso o build do jogo vem sempre antes. As
pastas `android/` e `ios/` já estão no repositório. O fluxo é o mesmo nas duas plataformas:

```bash
npm run build         # gera dist/
npx cap sync          # copia dist/ e os plugins para android/ e ios/
npx cap open android  # abre o projeto no Android Studio
npx cap open ios      # abre o projeto no Xcode (só em macOS)
```

Depois de `cap open`, rode o aplicativo pelo próprio Android Studio ou Xcode, em um emulador ou em
um aparelho. Sempre que o jogo mudar, repita `npm run build` e `npx cap sync`.

- **Android**: precisa do Android Studio e de um JDK. Funciona em Windows, macOS e Linux.
- **iPhone**: o build exige **macOS com Xcode**; não é possível compilar para iPhone em Windows ou
  Linux. Para instalar em um aparelho real também é preciso uma conta Apple Developer. As
  dependências do projeto iOS usam o Swift Package Manager, sem CocoaPods.
- **Ícones e tela de abertura**: os projetos nativos usam os ícones padrão do Capacitor. Os ícones
  do jogo estão em `public/icons/` (gerados por `npm run icons`) e servem à instalação como PWA.
  Antes de publicar nas lojas, troque os ícones nativos pelos da arte final.
- **Identificador**: `appId` está em `capacitor.config.json` (`br.com.planalto.corrida`). Troque
  antes de publicar nas lojas.

## Arte e licenças

Todos os ativos são originais do projeto e estão registrados em `src/assets/LICENSES.md`. A arte
provisória é gerada por `npm run art`, os ícones por `npm run icons` e a trilha e os efeitos
sonoros por `npm run audio`.
