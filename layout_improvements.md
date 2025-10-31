# Sugestões de Melhoria de Layout para Lui Bambini iA Editor

O objetivo é tornar o layout mais **comercial e intuitivo**, seguindo as preferências de design por um visual **limpo**, utilizando as **cores da marca** (`#54c5c1` e `#e8a1b3`) e com foco em **mobile-first**.

## 1. Estrutura Geral (`App.tsx`)

| Elemento | Melhoria Proposta | Justificativa |
| :--- | :--- | :--- |
| **Header/Branding** | Substituir o título de texto por um **logo** (placeholder ou buscar) e um nome mais comercial, como **"Lui Bambini | Provador Virtual"** ou **"Lui Bambini | Monte Seu Look IA"**. | Mais profissional e comercial. |
| **Cores** | Usar a cor **rosa (`#e8a1b3`)** como a cor primária de destaque (botões, links, bordas ativas) e o **verde/ciano (`#54c5c1`)** como cor secundária para elementos de suporte ou texto. | O rosa é mais associado à marca e ao público-alvo (moda infantil/feminina), tornando o visual mais comercial. |
| **Estrutura Principal** | Simplificar a estrutura de `if/else` no `App.tsx` para um fluxo mais claro: **Upload -> Opções -> Processamento -> Resultado**. | Aumenta a intuitividade do fluxo do usuário. |
| **Rodapé** | Manter o rodapé, mas garantir que os ícones e links usem as cores da marca no hover. O layout atual já é bom, mas a tipografia pode ser ajustada para ser mais limpa. | Reforça a identidade visual e a profissionalização. |

## 2. Componente de Upload (`ImageUploader.tsx`)

| Elemento | Melhoria Proposta | Justificativa |
| :--- | :--- | :--- |
| **Visual** | Aumentar o contraste e o apelo visual. Usar a cor rosa (`#e8a1b3`) para o estado de *drag-and-drop* ativo. | Mais moderno e intuitivo. |
| **Botões** | **Unificar** os botões "Selecione um arquivo" e "Buscar na Loja" em um único bloco de ação. O botão principal (Seleção) deve ter o **fundo rosa** e o secundário (Busca) deve ser um **botão fantasma** (texto rosa, fundo transparente). | Hierarquia visual clara e mais comercial. O botão principal deve ser o mais evidente. |
| **Texto** | Simplificar o texto. Ex: "Arraste e solte sua imagem aqui" ou "Clique para selecionar". | Mais direto e intuitivo. |

## 3. Componente de Opções de Geração (`GenerationOptionsForm.tsx`)

(A ser analisado em seguida, mas a premissa é aplicar o mesmo esquema de cores e tipografia.)

## 4. Componente de Resultados (`ResultsCard.tsx`)

(A ser analisado em seguida, mas a premissa é dar mais destaque à imagem gerada e aos botões de ação.)

---

**Próximos Passos:**
1.  Analisar `GenerationOptionsForm.tsx` e `ResultsCard.tsx`.
2.  Implementar as alterações de layout no `App.tsx` e `ImageUploader.tsx` (Fase 3).
3.  Ajustar as cores e estilos em todos os componentes.
4.  Testar e apresentar.
