# Contrato: comandos de entrada

A lógica do jogo (`src/core`) recebe somente os comandos abaixo; teclado e toque são convertidos
em comandos na camada `src/input`. Nenhum código da lógica lê teclas ou toques diretamente.

| Comando | Teclado | Toque | Efeito |
|---------|---------|-------|--------|
| `LEFT` | Seta esquerda | Deslizar ou arrastar para a esquerda | Vai para a faixa da esquerda; sem efeito na faixa da extremidade |
| `RIGHT` | Seta direita | Deslizar ou arrastar para a direita | Vai para a faixa da direita; sem efeito na faixa da extremidade |
| `JUMP` | Seta para cima | Deslizar para cima | Pula; só aceito se Chico está correndo |
| `SLIDE` | Seta para baixo | Deslizar para baixo | Desliza; só aceito se Chico está correndo |
| `PAUSE` | Esc ou P | Botão de pausa na tela | Alterna entre pausar e retomar |

Regras:

- Comandos são processados na ordem de chegada, a cada passo de tempo fixo.
- Um `JUMP` ou `SLIDE` recebido durante outra ação entra em fila por um intervalo curto (valor em
  `balance.json`) e é descartado se o intervalo vencer.
- Um gesto de toque só é reconhecido se passar da distância mínima de arraste (valor em
  `balance.json`), para evitar comandos acidentais.
- `PAUSE` também é gerado automaticamente quando a página perde o foco ou vai para segundo plano.
