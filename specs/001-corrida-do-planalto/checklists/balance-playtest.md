# Balanceamento: partida de Brasília

**Tarefa**: T075. **Meta** (SC-005): uma partida de Brasília, do início ao confronto do avião,
dura entre 2 e 4 minutos para um jogador médio.

**Estado**: ajustado e verificado por simulação em 2026-11-07; playtest com pessoas PENDENTE.

## Método

Corridas completas de Brasília sem renderização, com o piloto automático de
`tests/integration/autopilot.js` (desvia de tudo; no modo "caçador" também vai atrás das
moedas), 40 a 60 sementes por configuração. Como a velocidade só depende do tempo e da proximidade
de Caio, a duração de quem chega à pista de embarque quase não depende da habilidade.

## Problema encontrado

Com os valores antigos (`initialSpeed` 5, `speedAcceleration` 0,05, `maxSpeed` 10), Brasília durava
**119 a 123 s**: o limite inferior da meta. Um cartaz de campanha (velocidade extra por 5 s) já a
levaria abaixo de 2 minutos.

## Ajuste em `src/config/balance.json`

| Chave               | Antes | Depois | Por quê                                                       |
| ------------------- | ----- | ------ | ------------------------------------------------------------- |
| `initialSpeed`      | 5     | 4,5    | Começo mais calmo, mais tempo para aprender os comandos (SC-002) |
| `speedAcceleration` | 0,05  | 0,03   | Aceleração mais lenta                                         |
| `maxSpeed`          | 10    | 7,5    | Teto menor, e a pista de embarque também usa o teto           |
| `initialDistance`   | 500   | 600    | Corrida mais longa dá mais tempo para fechar a distância sozinho; sem isto, quem não pega moedas passava a vencer |

## Resultado

| Configuração        | Duração (jogando bem) | Vence caçando moedas | Vence sem caçar moedas |
| ------------------- | --------------------- | -------------------- | ---------------------- |
| Antes               | 119 a 123 s           | 40 de 40             | 2 de 40                |
| Velocidade ajustada, distância 500 | 146 a 149 s | 60 de 60            | 16 de 60               |
| **Final (distância 600)** | **cerca de 2,5 min** | **60 de 60**    | **0 de 60**            |

A duração final fica entre 2 e 4 minutos com folga para os dois lados. Quem coleta moedas ainda
vence com sobra (a distância chega a zero antes do fim); quem só desvia perde, mantendo a regra de
"chegar perto" da spec (FR-009, FR-010).

## A fazer com pessoas

O piloto automático joga sem erros e sem hesitar. Um jogador médio bate em obstáculos (a energia
cai e Caio se afasta 25 m por batida) e perde moedas, e só um playtest mostra se a fase ainda é
vencível e divertida.

- [ ] 5 ou mais pessoas jogam Brasília e cronometram a partida (meta: 2 a 4 minutos).
- [ ] Quantas vencem a fase na primeira tentativa? Se quase ninguém vencer, reduzir
      `initialDistance` ou `collisionDistancePenalty`; se quase todos vencerem, aumentá-los.
