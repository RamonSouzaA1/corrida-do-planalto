# Playtest mobile: Corrida do Planalto

**Cenário**: 5 do `quickstart.md` (história 5, P5). **Tarefa**: T069. **Spec**: SC-007, SC-008,
FR-016, FR-022.

**Estado**: PENDENTE em aparelhos reais. A parte automática foi feita em 2026-11-07; os itens
manuais abaixo precisam de pessoas com os aparelhos e não foram executados.

## Verificado automaticamente (emulação, não substitui aparelho)

Teste `npm run test:smoke`, projeto `mobile` (Chromium com o perfil do Pixel 7, toque ligado):

- [x] O jogo abre, inicia com um toque na tela e roda alguns segundos sem erros de console.
- [x] Gestos de arrastar (esquerda, direita, cima, baixo) chegam à corrida sem erro.
- [x] O botão de pausa aparece em aparelho de toque; tocar nele pausa a pista e tocar na tela retoma.
- [x] A área de jogo cabe na tela e mantém 9:16 em computador (1280x720), celular em paisagem
      (844x390) e em retrato (390x844), inclusive ao mudar o tamanho com a corrida em andamento.
- [x] O manifesto do aplicativo e os dois ícones são servidos.
- [x] `npx cap add android` e `npx cap add ios` geram `android/` e `ios/` a partir de `dist/`.

## A fazer em aparelho real

Marque cada item depois de jogar uma corrida inteira de Brasília e anote o aparelho, o sistema e o
navegador ou a versão do aplicativo.

### Navegador de celular

Aparelho / sistema / navegador: ____________________

- [ ] Corrida completa só com gestos: trocar de faixa, pular e deslizar respondem na hora.
- [ ] Os gestos não rolam, ampliam nem atualizam a página.
- [ ] Girar a tela durante a corrida reajusta o jogo sem perder a corrida; HUD visível nas duas
      orientações.
- [ ] Minimizar o navegador pausa o jogo; ao voltar, a pausa continua e o progresso se mantém.
- [ ] Botão de pausa fácil de tocar e sem comandos acidentais.

### Aplicativo Android

Aparelho / versão do Android: ____________________

- [ ] Compila e abre pelo Android Studio (`npm run build`, `npx cap sync`, `npx cap open android`).
- [ ] Mesmo comportamento da versão de navegador, com os mesmos gestos.
- [ ] Chamada telefônica ou tela bloqueada pausa o jogo.
- [ ] Áreas seguras (recorte da câmera, barra de navegação) não cobrem o HUD.

### Aplicativo iPhone (exige macOS com Xcode)

Aparelho / versão do iOS: ____________________

- [ ] Compila e abre pelo Xcode (`npm run build`, `npx cap sync`, `npx cap open ios`).
- [ ] Mesmo comportamento da versão de navegador, com os mesmos gestos.
- [ ] Minimizar o aplicativo pausa o jogo.
- [ ] Áreas seguras (notch ou ilha dinâmica, barra inferior) não cobrem o HUD.

## Problemas encontrados

Nenhum registrado ainda (nenhum aparelho real testado).
