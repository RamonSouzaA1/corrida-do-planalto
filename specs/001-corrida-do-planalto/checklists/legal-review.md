# Revisão de conteúdo: Corrida do Planalto

**Tarefa**: T073. **Requisito**: FR-021 (personagens, nomes, bandeiras e símbolos fictícios ou
originais; sem políticos reais, logotipos de partidos ou imagens protegidas; sátira que não mire um
único campo político).

**Data**: 2026-11-07. **Tipo**: autorrevisão técnica feita durante a implementação. Não é parecer
jurídico: antes de publicar nas lojas, uma pessoa responsável deve conferir os pontos marcados
como "decisão humana".

## O que foi examinado

- Todo texto de `src/config/i18n/*.json`, `src/config/characters.json` e `src/config/cities.json`,
  procurando nomes de políticos, partidos e slogans (busca por termos e leitura).
- Todos os sprites de `src/assets/sprites/` e os fundos de `src/assets/backgrounds/`, vistos
  ampliados.
- A origem de cada arquivo em `src/assets/LICENSES.md`.

## Resultado

| Item                                | Resultado                                                                    | Situação             |
| ----------------------------------- | ---------------------------------------------------------------------------- | -------------------- |
| Origem dos ativos                   | Toda a arte e o áudio são originais, gerados por scripts do projeto          | Aprovado             |
| Imagens de terceiros                | Nenhuma; nenhum ativo baixado ou copiado                                     | Aprovado             |
| Políticos reais, partidos, slogans  | Nenhum nome, sigla, número ou slogan nos textos e nos sprites                | Aprovado             |
| Nomes dos personagens               | "Chico do Planalto" e "Caio Herdeiro": nomes inventados, sem sobrenome real  | Decisão humana (1)   |
| Retratos                            | Personagens são bonecos genéricos; a nota de Washington não tem retrato      | Aprovado             |
| Bandeira do power-up                | Estava azul-branca-azul com sol: lembrava a bandeira da Argentina. Trocada   | Corrigido (2)        |
| Flâmula de Assunção e bandeirola    | Estavam em vermelho-branco-azul (Paraguai e EUA). Trocadas por cores neutras | Corrigido (2)        |
| Faixa presidencial                  | Verde e amarela, com medalha: evoca a faixa presidencial real                | Decisão humana (3)   |
| Cartaz de campanha                  | Cruz vermelha sobre fundo amarelo; sem sigla, número ou rosto                | Aprovado, ver (4)    |
| Monumentos                          | Congresso, Eixo, obelisco e cúpula só em silhueta estilizada, sem detalhes   | Aprovado             |
| Viaturas e carro oficial            | Sem brasão, inscrição ou logotipo de órgão                                   | Aprovado             |
| Equilíbrio da sátira                | Alvo é a perseguição e o cargo em geral, sem partido ou campo identificável  | Decisão humana (5)   |

## Correções feitas nesta revisão

- (2) `bandeira.png`, `bandeirola.png` e `flamula.png` foram redesenhadas em
   `scripts/build-placeholder-art.js` (xadrez vermelho e dourado com disco preto; dourado com
   listra preta; verde e preto) e regeneradas com `npm run art`. Nenhuma combina com uma bandeira
   de país. Os outros ativos não mudaram (conferido por soma de verificação).

## Pontos para decisão humana

- (1) **Nomes**: não encontrei coincidência com pessoa pública conhecida, mas não é possível
   garantir isso só pela leitura; vale uma busca rápida antes da publicação. Trocar um nome exige
   mexer só em `src/config/characters.json` (FR-017).
- (3) **Faixa presidencial**: a spec pede o item, e a versão atual é fictícia (listra com medalha
   vermelha), mas as cores verde e amarela evocam os símbolos nacionais do Brasil. Se houver
   dúvida, trocar as cores em `sash` no script de arte.
- (4) **Cartaz**: a cruz vermelha isolada pode lembrar o emblema da Cruz Vermelha, cujo uso é
   restrito em vários países. Está sobre fundo amarelo e fora de contexto médico, e o risco é baixo,
   mas trocar a cruz por outra marca é barato.
- (5) **Sátira**: avaliar se o conjunto (um herdeiro que foge de avião e um corredor que o persegue
   por quatro cidades) não é lido como alvo de um campo político específico.

## Para a arte final

Quando a arte provisória for trocada, repetir esta revisão sobre os arquivos novos: registrar a
origem e a licença de cada um em `src/assets/LICENSES.md` e evitar bandeiras, brasões, logotipos,
rostos reais e marcas.
