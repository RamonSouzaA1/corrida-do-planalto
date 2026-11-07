# Desempenho: Corrida do Planalto

**Tarefa**: T074. **Metas** (plan.md, SC-001, SC-003, SC-004): 60 quadros por segundo em pelo
menos 95% do tempo, resposta a comando em menos de 100 ms e tela de título em menos de 10 s.

**Estado**: medição automática feita em 2026-11-07; medição em celular de gama média real
PENDENTE.

## Como foi medido

Chromium do Playwright (headless, versão do `@playwright/test` 1.65.0) abrindo o build de produção
servido por `vite preview`, com a rede limitada a 10 Mbps e 40 ms de latência (conexão comum) por
emulação do Chrome DevTools.

- **Título**: tempo desde a navegação até a primeira imagem não vazia do canvas.
- **Quadros**: intervalos de `requestAnimationFrame` durante 8 s de corrida em Brasília, contando
  como "60 fps" o quadro de até 20,8 ms (16,7 ms mais 25% de folga).
- **Celular de gama média (aproximação)**: perfil do Pixel 7 com toque e a CPU limitada a 4 vezes
  mais lenta (`Emulation.setCPUThrottlingRate`). É só uma estimativa; não substitui um aparelho.

## Resultados

| Cenário                          | Título  | Quadro médio | p95     | Pior quadro | Quadros em 60 fps |
| -------------------------------- | ------- | ------------ | ------- | ----------- | ----------------- |
| Computador, CPU normal           | 1,22 s  | 16,7 ms      | 16,7 ms | 16,8 ms     | 100%              |
| Computador, CPU 4x mais lenta    | 1,86 s  | 16,7 ms      | 16,7 ms | 16,8 ms     | 100%              |
| Celular (Pixel 7), CPU normal    | 1,35 s  | 16,7 ms      | 16,8 ms | 16,8 ms     | 100%              |
| Celular (Pixel 7), CPU 4x lenta  | 1,85 s  | 16,7 ms      | 16,8 ms | 16,8 ms     | 100%              |

- **Título em menos de 10 s**: atendido com ampla folga (menos de 2 s). O build pesa 1,9 MB: 1,26 MB
  de JavaScript (Phaser incluído) e 0,6 MB de áudio. O Vite avisa que o pacote passa de 500 kB; não
  é um problema com esses tempos, e dividi-lo seria complexidade sem necessidade (Constituição,
  princípio I).
- **60 quadros por segundo**: atendido em todos os cenários medidos, inclusive com a CPU 4x mais
  lenta. O jogo é leve (320 x 180, poucos sprites).
- **Resposta a comando em menos de 100 ms**: não foi medida diretamente. Pelo desenho, um comando
  espera no máximo um passo de tempo fixo (16,7 ms) para entrar na lógica e um quadro (16,7 ms) para
  aparecer, cerca de 33 ms a 60 fps, mais a latência do próprio aparelho e da tela, que o teste
  não vê.

## Limites desta medição

- O Chromium automatizado trava o `requestAnimationFrame` em 60 Hz, então um quadro mais rápido do
  que isso não aparece; e a CPU limitada não reproduz a GPU, a memória nem o aquecimento de um
  celular real.
- A trilha sonora e os efeitos tocam normalmente nas medições, mas o som não foi ouvido por uma
  pessoa.

## A fazer em aparelho real

Em um celular Android de gama média e em um iPhone (navegador e aplicativo empacotado), jogar
Brasília inteira e anotar:

- [ ] Quadros por segundo estáveis (ferramenta de desempenho do navegador ou do Android Studio/Xcode).
- [ ] Comando percebido como imediato (SC-004).
- [ ] Tela de título em menos de 10 s em rede móvel comum.
- [ ] Aparelho, sistema, navegador ou versão do aplicativo usados: ____________________
