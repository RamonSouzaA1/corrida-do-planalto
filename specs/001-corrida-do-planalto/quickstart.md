# Quickstart: Corrida do Planalto

Guia para rodar o jogo e validar a feature de ponta a ponta. Detalhes de dados em
[data-model.md](data-model.md); formatos em [contracts/](contracts/).

## Pré-requisitos

- Node.js 20 LTS ou superior e npm
- Um navegador moderno de computador; um celular (ou emulador) para a validação mobile
- Para a fase mobile: Android Studio (Android) e macOS com Xcode (iPhone)

## Instalação e execução

```bash
npm install
npm run dev        # servidor local de desenvolvimento
npm run build      # gera a pasta estática de produção
npm run preview    # serve a pasta estática gerada
```

## Verificações automáticas

```bash
npm run lint       # ESLint e Prettier
npm test           # Vitest: unitários e corridas simuladas
npm run test:smoke # Playwright: abre o jogo, joga alguns segundos, sem erros de console
```

## Cenários de validação manual

1. **História 1 (P1)**: abrir o jogo, iniciar a corrida, trocar de faixa, pular um obstáculo
   baixo, deslizar sob uma barreira alta, coletar moedas e bater. Esperado: pontuação sobe com as
   moedas; fim de corrida mostra a pontuação e a opção de jogar de novo.
2. **História 2 (P2)**: correr Brasília até o avião. Esperado: barra de distância no topo reage a
   moedas e colisões; ao fim da pista, Caio foge e a fase é vencida se a distância ficou dentro do
   limite, ou a corrida é perdida se não.
3. **História 3 (P3)**: provocar uma colisão (continua com menos energia), coletar bandeira,
   cartaz, mala e faixa presidencial; perder corridas até acabar as vidas. Esperado: efeitos e
   durações da spec; volta a Brasília com 3 vidas ao fim das vidas.
4. **História 4 (P4)**: avançar pelas quatro cidades. Esperado: paleta, fundo, obstáculos e
   coletáveis próprios; só o avião de Washington permite prender Caio.
5. **História 5 (P5)**: repetir os cenários 1 e 2 no celular com gestos de toque e no computador
   com setas; girar a tela e minimizar o navegador. Esperado: todos os comandos funcionam, a
   interface se reajusta e o jogo pausa sozinho.
6. **Configuração (FR-017)**: trocar o nome de um personagem em `src/config/characters.json` e
   reabrir o jogo. Esperado: o novo nome aparece sem alterar nenhum código em `src/core`.
7. **Progresso (FR-025)**: perder uma corrida em uma cidade avançada, fechar e reabrir o jogo.
   Esperado: o jogo continua na mesma cidade, com as vidas restantes e o recorde.

## Metas de desempenho a verificar

- 60 quadros por segundo durante a corrida em computador e em celular de gama média
- Resposta a comando em menos de 100 ms
- Tela de título em menos de 10 s depois de abrir o jogo

## Fase mobile (depois do jogo estável no navegador)

```bash
npm run build
npx cap add android   # e, em macOS, npx cap add ios
npx cap sync
npx cap open android  # e npx cap open ios
```

Esperado: o jogo se comporta como na versão de navegador, com os mesmos controles por toque.
