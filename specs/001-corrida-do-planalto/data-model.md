# Data Model: Corrida do Planalto

Dados em memória durante a corrida e dados guardados no aparelho. Não há banco nem servidor.

## Personagem (configuração)

Definido em `src/config/characters.json`; contrato em
[contracts/characters.schema.json](contracts/characters.schema.json).

| Campo | Tipo | Regra |
|-------|------|-------|
| `id` | texto | Um de `runner`, `target`, `guard`, `reporter`; único |
| `name` | texto | Não vazio; se ausente, usa o nome padrão e avisa |
| `sprite` | texto | Nome de sprite existente; se ausente, usa o sprite padrão |

## Cenário / Cidade (configuração)

Definido em `src/config/cities.json`.

| Campo | Tipo | Regra |
|-------|------|-------|
| `id` | texto | `brasilia`, `assuncao`, `buenos-aires` ou `washington` |
| `order` | inteiro 1 a 4 | Único; define a ordem das fases |
| `palette` | lista de cores | No máximo 16 |
| `obstacles` | lista | Cada item: tipo `low` (pular) ou `high` (deslizar), sprite |
| `collectibles` | lista | Moedas e coletáveis temáticos |
| `lengthMeters` | inteiro | 1.000 por padrão |
| `catchable` | booleano | `true` só em Washington; nas outras Caio sempre foge |

## Corrida (em memória)

| Campo | Tipo | Regra |
|-------|------|-------|
| `cityId` | texto | Cidade atual |
| `state` | enumeração | `running`, `paused`, `won`, `lost` |
| `speed` | número | Cresce com o tempo e com a proximidade de Caio |
| `lane` | inteiro 0 a 2 | Faixa atual; limitada às extremidades |
| `action` | enumeração | `run`, `jump`, `slide`; só um por vez |
| `energy` | inteiro 0 a 2 | MVP: 1; versão completa: 2 níveis |
| `score` | inteiro ≥ 0 | Soma de moedas e bônus |
| `distanceToTarget` | número ≥ 0 | Diminui sozinha, com moedas; aumenta com colisões |
| `metersRun` | número ≥ 0 | Avança até `lengthMeters` da cidade |
| `shield` / `boost` | tempo restante | 8 s e 5 s; renovam, não acumulam |
| `inBossRunway` | booleano | `true` nos últimos metros de cada cidade |

### Transições de estado

- `running` → `paused`: perda de foco ou botão de pausa; volta a `running` ao retomar.
- `running` → `lost`: colisão sem energia ou sem escudo restante; ou fim da pista de embarque com a
  distância acima do limite da cidade (mínima de vitória; zero em Washington).
- `running` → `won`: fim da pista de embarque com a distância dentro do limite (Caio foge nas
  cidades 1 a 3; é preso em Washington).

## Progresso do jogador (guardado no aparelho)

Contrato em [contracts/save-data.schema.json](contracts/save-data.schema.json).

| Campo | Tipo | Regra |
|-------|------|-------|
| `version` | inteiro | Versão do formato, para migração |
| `bestScore` | inteiro ≥ 0 | Atualizado ao quebrar o recorde |
| `cityReached` | texto | Cidade em que o jogador recomeça; começa em `brasilia` |
| `lives` | inteiro ≥ 0 | Começa em 3; ao chegar a zero, volta a 3 e a `brasilia` |
| `soundOn` | booleano | Preferência de som |

Validação: dado ausente, de versão desconhecida ou corrompido é descartado e substituído pelos
valores iniciais, sem quebrar o jogo.

## Coletável / Power-up

| Item | Efeito | Duração |
|------|--------|---------|
| Moeda | Soma pontos e reduz a distância até Caio | Instantâneo |
| Bandeira | Escudo contra uma colisão | 8 s |
| Cartaz de campanha | Velocidade extra | 5 s |
| Mala de dinheiro | Caio cai; 50 m a menos de distância | Instantâneo |
| Faixa presidencial | Uma vida extra | Instantâneo |

Pegar um item já ativo renova a duração; efeitos não acumulam.
