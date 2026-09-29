# Gestão da Loja de Limpeza

Sistema simples para controlar uma pequena loja de produtos de limpeza (sabão em pó, sabão líquido, amaciante e outros), com vendas para clientes da região e clientes recorrentes.

Funciona direto no navegador, no computador ou no celular. Não precisa instalar nada nem ter servidor.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `index.html` | Estrutura da página: carrega o visual e o JavaScript |
| `style.css` | Visual: cores, tema claro/escuro, layout para celular |
| `app.js` | Toda a lógica em JavaScript: dados, cálculos, alertas, telas, formulários e ligação com o Google Planilhas |
| `google-apps-script/Code.gs` | Código que vai **dentro da sua planilha Google** (não é usado pelo GitHub Pages) |

`index.html`, `style.css` e `app.js` precisam ficar juntos, na mesma pasta.

## O que o sistema faz

- **Painel:** faturamento, valor recebido, valor a receber, valores vencidos, valor do estoque, número de vendas e de clientes, lucro bruto e líquido, despesas, total investido e margem, com comparação com o mês anterior.
- **Respostas rápidas:** as 20 perguntas do dia a dia, como "quem está me devendo?", "quais produtos preciso repor?" e "quanto posso retirar sem comprometer o capital de giro?".
- **Produtos/Estoque:** cadastro completo. O estoque é calculado sozinho (inicial + entradas − saídas) e mostra o status 🟢 normal, 🟡 baixo ou 🔴 crítico/esgotado.
- **Entradas de estoque:** cada compra aumenta o estoque e atualiza o custo médio do produto.
- **Vendas:** uma venda pode ter vários produtos, com desconto. Custo, lucro bruto e baixa no estoque são calculados automaticamente.
- **Contas a receber (fiado):** status Pendente, Vencido, Vence hoje, Pago e Pago com atraso. Aceita pagamento parcial. Mostra quanto cada cliente deve.
- **Clientes:** total comprado, total pago, total pendente e histórico completo de compras e pagamentos.
- **Despesas e investimentos:** ficam separados, para o cálculo do lucro sair correto.
- **Fluxo de caixa:** saldo inicial + entradas − saídas = saldo final, por dia, semana, mês ou ano.
- **Relatório mensal, análise de produtos e sugestão de reposição.**
- **Alertas automáticos:** pagamentos atrasados, estoque baixo, despesas vencidas, queda no faturamento e margem baixa.
- **Histórico de movimentações de estoque:** nada é apagado. Cancelamentos e correções geram um novo registro.

## Como o lucro é calculado

| Item | Cálculo |
|---|---|
| Faturamento | Tudo o que foi vendido no período, pago ou não |
| Custo dos produtos vendidos | Quantidade vendida × custo de cada produto |
| Lucro bruto | Faturamento − custo dos produtos vendidos |
| Lucro operacional | Lucro bruto − despesas operacionais |
| Lucro líquido | Lucro operacional − perdas de estoque |

- Compras de mercadoria viram estoque. Elas só entram no custo quando o produto é vendido.
- Investimentos aparecem separados e não diminuem o lucro do mês.
- Venda fiado conta no faturamento na hora, mas só entra no caixa quando é paga.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub (por exemplo, `loja-limpeza`).
2. Envie os arquivos `index.html`, `style.css`, `app.js`, `README.md` e a pasta `google-apps-script` para ele (botão **Add file → Upload files**; dá para arrastar a pasta inteira).
3. No repositório, abra **Settings → Pages**.
4. Em **Source**, escolha **Deploy from a branch**. Selecione a branch `main` e a pasta `/ (root)` e clique em **Save**.
5. Em alguns minutos o sistema fica disponível em `https://SEU-USUARIO.github.io/loja-limpeza/`.

Você também pode usar sem publicar: basta abrir o `index.html` com dois cliques.

## Banco de dados no Google Planilhas

Tudo o que você registra no app (produtos, clientes, vendas, pagamentos, entradas, despesas, investimentos, movimentações de estoque e caixa) é gravado numa planilha Google sua. Cada assunto fica numa aba, com uma linha por lançamento, para você consultar, filtrar e conferir quando quiser.

| Aba | O que guarda |
|---|---|
| `Produtos` | Cadastro, custo, preço e as colunas calculadas **estoque_atual**, **margem_rs**, **margem_pct** e **status_estoque** |
| `Clientes` | Cadastro e as colunas calculadas **qtd_compras**, **total_comprado** e **total_pendente** |
| `Vendas` | Uma linha por venda e as colunas calculadas **lucro_bruto**, **valor_pago**, **valor_aberto** e **situacao** (Pago, Pendente, Vencido…) |
| `Itens_Venda` | Os produtos de cada venda |
| `Pagamentos` | Cada pagamento recebido, com data e forma |
| `Compras` | Entradas de mercadoria |
| `Despesas` / `Investimentos` / `Caixa` | Gastos, investimentos e outras entradas ou retiradas |
| `Movimentacoes` | Histórico completo do estoque |
| `Config` | Nome da loja, saldo inicial e regras dos alertas |

As colunas calculadas (cabeçalho lilás) são fórmulas da própria planilha e se atualizam sozinhas.

### Passo a passo para ligar (uma vez só, cerca de 10 minutos)

**1. Crie a planilha**
Entre em [sheets.google.com](https://sheets.google.com) e crie uma planilha em branco. Dê um nome, por exemplo `Loja de Limpeza - Banco de dados`.

**2. Cole o código**
Na planilha, abra **Extensões → Apps Script**. Apague o que estiver no editor e cole todo o conteúdo do arquivo `google-apps-script/Code.gs`.

**3. Crie sua chave**
Na linha `const CHAVE = 'TROQUE-ESTA-CHAVE';`, troque o texto entre aspas por uma senha só sua, com letras e números e sem espaços. Por exemplo: `const CHAVE = 'LojaDani2026xyz';`. Clique no ícone de disquete para **salvar**.

**4. Autorize**
Na barra de cima do editor, escolha a função `autorizar` e clique em **Executar**. O Google pede permissão para o código acessar a sua planilha:
- Clique em **Revisar permissões** e escolha a sua conta.
- Se aparecer "O Google não verificou este app", clique em **Avançado → Acessar (não seguro)**. Isso aparece porque o código foi criado por você e não passou pela verificação do Google. Ele só acessa esta planilha.
- Clique em **Permitir**.

**5. Publique**
Clique em **Implantar → Nova implantação**. Na engrenagem ⚙️, escolha **App da Web** e preencha:
- **Executar como:** Eu (seu e-mail)
- **Quem pode acessar:** Qualquer pessoa

Clique em **Implantar** e **copie o URL do app da Web** (termina em `/exec`).

**6. Conecte o app**
No app, vá em **Ajustes → Conectar ao Google Planilhas**. Cole o URL, digite a mesma chave do passo 3 e clique em **Conectar**. As abas são criadas sozinhas:
- Se o aparelho já tinha dados, eles são enviados para a planilha.
- Se a planilha já tinha dados, eles são carregados no app.
- Se os dois tiverem dados, o app pergunta qual versão manter.

**7. Nos outros aparelhos**
Repita só o passo 6 no celular, no computador ou em qualquer outro aparelho. Todos passam a usar a mesma planilha.

### Como a sincronização funciona

A sincronização é em tempo real, nos dois sentidos:

- **App → planilha:** cada lançamento é gravado na planilha assim que você salva, em 1 ou 2 segundos.
- **Planilha → app:** a cada 8 segundos o app faz uma consulta bem leve para saber se algo mudou. Isso inclui um lançamento feito em outro aparelho ou uma edição feita direto na planilha. Se mudou, a tela se atualiza sozinha.
- Com o app aberto em dois aparelhos, o que você lança num aparece no outro em poucos segundos.
- Se você estiver no meio de um formulário, a atualização espera você fechar, para não atrapalhar.
- No canto do menu aparece **🟢 Sincronizado em tempo real**.
- **Sem internet**, o app continua funcionando. As alterações ficam na fila (**⚠ alterações esperando envio**) e são enviadas quando a conexão volta.
- Para forçar na hora, use **Ajustes → Sincronizar agora**.
- Você pode **corrigir dados direto na planilha** (um preço, um telefone, um valor). Na próxima sincronização o app mostra a correção. Não apague nem altere a coluna `id`, que liga as abas entre si, e não mexa nas colunas lilás, que são calculadas.
- Você pode criar colunas extras suas (por exemplo, "anotações") à direita. O app não mexe nelas.

### Segurança

- O URL e a chave **não ficam no código do GitHub**. Você digita os dois no app e eles ficam guardados só no navegador de cada aparelho. Por isso o repositório pode ser público sem expor sua planilha.
- Quem não tiver a chave não consegue ler nem gravar nada.
- **Não compartilhe o URL e a chave.** Quem tiver os dois consegue ler e alterar os dados da loja.
- Para trocar a chave: altere a linha `CHAVE` no Apps Script, clique em **Implantar → Gerenciar implantações → ✏️ Editar**, escolha **Versão: Nova versão**, clique em **Implantar** e conecte o app de novo.

### Se alterar o código do Apps Script

Depois de salvar, publique de novo em **Implantar → Gerenciar implantações → ✏️ Editar → Versão: Nova versão → Implantar**. O URL continua o mesmo.

### Sem planilha

Se você não conectar a planilha, os dados ficam salvos só no navegador do aparelho. Nesse caso, use **Ajustes → Baixar backup** com frequência.

## Primeiros passos

1. Em **Ajustes**, conecte o Google Planilhas (veja acima) e informe o nome da loja e quanto dinheiro você tem hoje no caixa (saldo inicial).
2. Cadastre os produtos com o estoque que você já tem.
3. Cadastre os clientes.
4. No dia a dia, use os botões ➕ Nova venda, 📦 Entrada de estoque e 💰 Registrar pagamento.

Se quiser conhecer o sistema antes, use **Carregar dados de exemplo** e depois **Apagar dados de exemplo**.

## Tecnologia

HTML, CSS e JavaScript puro, sem dependências nem etapa de build. As fontes (Bricolage Grotesque e Figtree) vêm do Google Fonts. Sem internet, o sistema continua funcionando com as fontes padrão do aparelho.
