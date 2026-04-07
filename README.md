# Sistema EXTINÇÃO RPG

![Foundry v13](https://img.shields.io/badge/foundry-v13-green)
![Status](https://img.shields.io/badge/status-playable-orange)

> **"O mundo não acabou com um estrondo. Ele acabou com um grito, e depois silêncio."**

O **EXTINÇÃO** é um sistema de RPG de Horror de Sobrevivência desenvolvido para Foundry VTT. É um hack focado em escassez de recursos, alta letalidade, gerenciamento de estresse e a constante ameaça da Horda.

O sistema mistura elementos da *Year Zero Engine* (parada de dados d6) com a simplicidade do *The Black Hack* (Dado de Uso), criando uma experiência ágil e brutal.

### 🌟 Destaques
* **Atmosfera Sombria:** Interface customizada "Dark Industrial".
* **Automação:** Criação de personagens rápida com arquétipos.
* **Tensão:** Mecânicas de Ruído e Munição escassa integradas.

[Ver Repositório no GitHub](https://github.com/KorujaSedex123/extincao-rpg)

# Como Instalar

O sistema é compatível com Foundry VTT v12 e v13. Siga os passos abaixo para instalar no seu aplicativo ou servidor dedicado.

### Passo a Passo

1. Abra o Foundry VTT e vá na aba **Game Systems** (Sistemas de Jogo).
2. Clique no botão **Install System**.
3. No campo inferior **Manifest URL**, cole o link oficial:


**Link do Manifesto:**
`https://raw.githubusercontent.com/KorujaSedex123/extincao-rpg/main/system.json`


4. Clique em **Install**.
5. Crie um novo Mundo e selecione **EXTINÇÃO RPG** como sistema.

---

### Atualizando o Sistema
Sempre que uma nova versão for lançada (novas regras ou correções):
1. Vá em **Game Systems**.
2. Clique no botão **Update All** ou no ícone de atualização ao lado do sistema Extinção.

# Regras do Sistema

O EXTINÇÃO foi desenhado para ser rápido e letal. Aqui estão os pilares do jogo.

## O Dado é o Juiz (Rolagens)
O sistema utiliza apenas **d6 (Dados de 6 faces)**.
* **A Parada:** Soma-se `Atributo + Perícia`.
* **Sucesso:** Qualquer dado que cair **6** é um sucesso.
* **Críticos:** Cada 6 adicional aumenta o efeito (Dano extra ou Façanhas).

### A Regra do Instinto (Glitch)
Se penalidades (como ferimentos ou escuridão) reduzirem sua parada de dados a **0 ou menos**, você rola o **Dado de Instinto** (1d6).
* **1, 2 ou 3:** <span style="color:red">**GLITCH (Catástrofe).**</span> A arma trava, você cai, ou faz barulho.
* **6:** Sucesso sujo (com consequência).

## Sobrevivência e Recursos

### ❤️ Vida e Resistência
* **PV (Pontos de Vida):** Ferimentos físicos. Difícil de recuperar (exige Medicina). Se zerar, o personagem cai morrendo.
* **PR (Pontos de Resistência):** Fôlego e energia. Recupera com descanso curto (comer/beber). Usado para ativar habilidades.

### 🧠 Estresse
O horror cobra seu preço.
* Certas situações (ver a Horda, quase morrer) causam Estresse.
* Se a barra encher (6 pontos), o personagem entra em **COLAPSO**.

### 🔫 O Dado de Uso (Munição)
Não contamos balas. Usamos uma escala de dados para representar a escassez:
> **d12 ➞ d10 ➞ d8 ➞ d6 ➞ d4 ➞ VAZIO**

Ao usar um item (atirar, beber água, usar kit médico):
1. Role o dado atual do item.
2. Se cair **1 ou 2**, o dado diminui um nível.
3. Se cair 1 ou 2 no **d4**, o item acaba.

# Atores e Fichas

O sistema possui 4 tipos de fichas especializadas.

## 1. Sobrevivente (PJ)
A ficha principal dos jogadores.
* **Automação:** Selecione um Arquétipo (ex: "O Combatente") e os atributos se preenchem.
* **Monitor de Infecção:** Acompanhe o avanço do vírus (Saudável ➞ Incubação ➞ Febre ➞ Necrose).
* **Travamento:** Use o cadeado 🔒 no topo para alternar entre "Modo Edição" e "Modo Jogo".

## 2. Inimigo (NPC)
Ficha simplificada para o Mestre.
* **Instinto:** Para zumbis e monstros (sem perícias, apenas dados brutos).
* **Tático:** Para humanos armados (com perícias e estratégia).

## 3. A Horda
Uma ficha especial para gerenciar grandes massas de inimigos como uma força da natureza.
* **Medidor de Alerta:** Controla visualmente o perigo (1 a 6).
* **Integração com Token:** O nível de alerta aparece automaticamente sobre o token no mapa.

## 4. Refúgio
Para campanhas longas, gerencie a Base dos jogadores.
* **Recursos:** Comida, Água e Segurança.
* **Moral:** A sanidade coletiva do grupo.


# Ferramentas de Automação

O sistema inclui macros poderosas para facilitar a vida do Mestre.

### Importador de Aventura: "O Túnel do Eco"
Uma One-Shot completa pronta para jogar.
1. Crie uma Macro do tipo *Script*.
2. Cole o código do importador (disponível no Discord/GitHub).
3. Execute para gerar:
   * 10 Personagens prontos.
   * Todos os Monstros e Itens.
   * Diários com a história completa.

### Monitor de Ruído
Um painel flutuante para controlar a tensão.
* Abre uma janela com o Nível de Ruído atual.
* Botões para aumentar/diminuir o perigo.
* Avisa no chat quando o nível sobe.

### Gerador de Regras
Cria um Compêndio de Diários com todas as regras resumidas para consulta rápida durante o jogo (HTML formatado).
