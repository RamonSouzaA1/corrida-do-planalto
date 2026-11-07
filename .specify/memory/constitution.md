<!--
Relatório de Impacto da Sincronização
- Mudança de versão: 1.0.0 → 1.1.0
- Princípios modificados: nenhum renomeado em substância (I, II e III traduzidos para português;
  III passou a exigir funcionamento em tela sensível ao toque)
- Seções adicionadas: princípio IV (Web First e Portabilidade Mobile)
- Seções removidas: nenhuma
- Mudanças materiais: stack definida (JavaScript, navegador, portável para Android e iPhone);
  constituição inteira traduzida para português
- Itens pendentes: nenhum
-->
# Constituição do Pega Ladrão

## Princípios Fundamentais

### I. Simplicidade Primeiro (YAGNI)
Toda funcionalidade DEVE começar com o design mais simples que atenda à especificação.
Abstrações, dependências e opções de configuração NÃO DEVEM ser adicionadas para necessidades
hipotéticas. Qualquer complexidade adicional DEVE ser justificada na seção de controle de
complexidade do plano.
Justificativa: um jogo pequeno só continua fácil de alterar e de terminar se o escopo e a
estrutura permanecerem pequenos.

### II. Qualidade de Código
O código DEVE ser legível, formatado de forma consistente e verificado por ferramentas
automáticas de lint e formatação. A lógica do jogo (regras, pontuação, colisões, condições de
vitória e derrota) DEVE ficar separada da renderização e do tratamento de entrada, para poder
ser testada isoladamente. Mudanças DEVEM ser revisadas antes do merge e as verificações
automáticas DEVEM passar.
Justificativa: lógica separada é testável e evita que bugs de regras se escondam no código de
apresentação.

### III. Desempenho e Experiência do Jogador
O jogo DEVE responder bem: o tratamento de entrada NÃO DEVE apresentar atraso perceptível, e a
taxa de quadros alvo e o orçamento de latência de entrada DEVEM ser definidos no plano de cada
funcionalidade e verificados antes do lançamento. Controles, feedback, menus e estilo visual
DEVEM ser consistentes em todo o jogo. As interações principais DEVEM ser acessíveis (por
exemplo, não depender apenas de cor, e ter controles claramente comunicados) e DEVEM funcionar
tanto com mouse/teclado quanto com toque.
Justificativa: um jogo se sustenta ou fracassa pela sensação de jogá-lo.

### IV. Web First e Portabilidade Mobile
O jogo DEVE ser escrito em JavaScript e DEVE rodar diretamente em um navegador moderno, sem
instalação, build obrigatório pesado ou servidor próprio para ser aberto e jogado. O código
DEVE ser portável para Android e iPhone (iOS), por exemplo via PWA ou empacotamento com
Capacitor/Cordova, sem reescrita da lógica do jogo. O layout DEVE ser responsivo e funcionar em
telas pequenas, em orientação retrato e paisagem. APIs específicas de plataforma DEVEM ser
isoladas atrás de uma camada fina, para que a base de código seja única.
Justificativa: uma única base em JavaScript alcança desktop, Android e iPhone com o menor custo
de manutenção.

## Restrições Técnicas

- Tipo de projeto: jogo. Linguagem: JavaScript. Plataforma principal: navegador web moderno
  (desktop e mobile). Plataformas de destino adicionais: Android e iPhone (iOS).
- O jogo DEVE ser aberto a partir de arquivos estáticos (por exemplo, abrindo o `index.html` ou
  servindo a pasta estática), sem backend obrigatório.
- Dependências DEVEM ser adicionadas somente quando substituírem significativamente mais código
  do que introduzem, e DEVEM funcionar em navegadores móveis.
- Ativos (arte, áudio) DEVEM ter licença e origem conhecidas registradas no repositório.
- Engine ou framework específico: ainda não definido. A escolha DEVE respeitar o princípio IV e
  ser registrada aqui por meio de emenda.

## Fluxo de Desenvolvimento

- O trabalho segue o fluxo do Spec Kit: especificar → planejar → tarefas → implementar.
- Cada plano DEVE incluir uma Verificação da Constituição contra os princípios acima.
- Cada funcionalidade DEVE ser jogável/verificável ao final da implementação, e não apenas
  compilar ou carregar.
- Testes automatizados DEVEM cobrir a lógica do jogo; notas de playtest manual DEVEM cobrir a
  sensação de jogo e a UX, incluindo teste em pelo menos um navegador mobile.

## Governança

Esta constituição prevalece sobre as demais práticas do projeto. Emendas exigem alteração
documentada neste arquivo, incremento de versão e revisão de specs e planos dependentes para
detectar conflitos.

- Versionamento: MAJOR para remoção ou redefinição de princípios; MINOR para novos princípios ou
  seções, ou orientação materialmente ampliada; PATCH para esclarecimentos e ajustes de redação.
- Conformidade: todo plano e toda revisão DEVEM verificar a aderência; violações DEVEM ser
  justificadas no controle de complexidade do plano ou corrigidas.

**Versão**: 1.1.0 | **Ratificada**: 2026-11-07 | **Última Emenda**: 2026-11-07
