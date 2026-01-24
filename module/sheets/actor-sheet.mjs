import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { EXTINCAO } from "../helpers/config.mjs";
import { taskRoll } from "../helpers/dice.mjs";

const ActorSheet = foundry.appv1.sheets.ActorSheet;

export class ExtincaoActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["extincao", "sheet", "actor", "extincao-sheet"],
      template: "systems/extincao/templates/actor/actor-sheet.hbs",
      width: 700,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
    });
  }

  /** @override */
  get template() {
    // Se for Horda, carrega o template específico
    if (this.actor.type === 'horda') {
      return "systems/extincao/templates/actor/actor-horda-sheet.hbs";
    }

    // Se for NPC, carrega o de NPC
    if (this.actor.type === 'npc') {
      return "systems/extincao/templates/actor/actor-npc-sheet.hbs";
    }
    if (this.actor.type === 'sobrevivente' || this.actor.type === 'character') {
      // Padrão (Sobrevivente)
      return "systems/extincao/templates/actor/actor-sobrevivente-sheet.hbs";
    }
    if (this.actor.type === 'refugio') {
      return "systems/extincao/templates/actor/actor-refugio-sheet.hbs";
    }
    if (this.actor.type === 'veiculo') {
      return "systems/extincao/templates/actor/actor-veiculo-sheet.hbs";
    }

    return "systems/extincao/templates/actor/actor-sobrevivente-sheet.hbs";
  }
  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = super.getData();
    const actorData = this.document.toObject(false);

    context.system = actorData.system;
    context.flags = actorData.flags;
    context.isLocked = this.actor.getFlag("extincao", "sheetLocked") || false;

    // --- MAPA DE PERÍCIAS ---
    const SKILL_MAP = {
      "briga": "for", "armas_brancas": "for", "atletismo": "for",
      "armas_fogo": "des", "furtividade": "des", "pilotagem": "des", "ladinagem": "des", "esquiva": "des",
      "vigor": "con",
      "medicina": "int", "tecnologia": "int", "investigacao": "int", "sobrevivencia": "int", "ciencias": "int",
      "percepcao": "per", "atencao": "per", "intuicao": "per",
      "lideranca": "von", "adestramento": "von", "intimidacao": "von", "diplomacia": "von"
    };

    if (context.system.skills) {
      for (const [key, skill] of Object.entries(context.system.skills)) {
        skill.attribute = SKILL_MAP[key] || "int";
      }
    }

    // Prepara itens (Inventário)
    if (actorData.type == 'sobrevivente' || actorData.type == 'character' || actorData.type == 'npc' || actorData.type == 'refugio' || actorData.type == 'veiculo') {
      this._prepareItems(context);
    }

    // CARREGAR ATORES VINCULADOS (Drag & Drop Visual)
    if (context.system.details?.vinculo_target) {
      context.vinculoActor = game.actors.get(context.system.details.vinculo_target);
    }
    if (context.system.details?.atrito_target) {
      context.atritoActor = game.actors.get(context.system.details.atrito_target);
    }

    context.rollData = context.actor.getRollData();
    context.effects = prepareActiveEffectCategories(this.actor.effects);
    context.arquetipos = EXTINCAO.ARQUETIPOS;

    const editorClass = foundry.applications?.ux?.TextEditor ?? TextEditor;
    context.enrichedBiography = await editorClass.enrichHTML(this.actor.system.details?.biography || "", { async: true, relativeTo: this.actor });

    context.isLocked = this.actor.getFlag("extincao", "sheetLocked") || false;

    return context;
  }
  /**
    * Organiza os itens em categorias para facilitar o uso no HTML
    */
  _prepareItems(context) {
    // 1. Cria as gavetas (listas) vazias
    const armas = [];
    const equipamentos = [];
    const itens = [];       // <--- ESTA É A GAVETA DE DIVERSOS
    const qualidades = [];
    const projetos = [];
    const habitantes = [];

    // 2. Separa cada item na gaveta certa
    for (let i of context.items) {
      i.img = i.img || "icons/svg/item-bag.svg";

      // -- SEPARAÇÃO --
      if (i.type === 'arma') {
        armas.push(i);
      }
      else if (i.type === 'equipamento') {
        equipamentos.push(i);
      }
      else if (i.type === 'qualidade' || i.type === 'defeito') {
        qualidades.push(i);
      }
      else if (i.type === 'habitante') {
        i.img = i.img || "icons/svg/mystery-man.svg";
        habitantes.push(i);
      }
      else if (i.type === 'projeto') {
        projetos.push(i);
      }
      else if (i.type === 'projeto') {
        projetos.push(i);
      }

      // 3. TUDO O RESTO VAI PARA DIVERSOS
      else {
        itens.push(i);  // <--- AQUI ELE GUARDA O ITEM GENÉRICO
      }
    }

    // 4. Entrega as listas prontas para o HTML usar
    context.armas = armas;
    context.equipamentos = equipamentos;
    context.itens = itens;      // <--- IMPORTANTE: ENVIA A LISTA 'itens'
    context.qualidades = qualidades;
    context.projetos = projetos;
    context.habitantes = habitantes;
  }

  /** @override */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const actor = this.actor;

    // ---------------------------------------------------------
    // LÓGICA ESPECIAL DO REFÚGIO: ATOR -> ITEM HABITANTE
    // ---------------------------------------------------------
    if (actor.type === 'refugio' && data.type === 'Actor') {
      // 1. Busca os dados do Ator que foi arrastado
      const sourceActor = await fromUuid(data.uuid);
      if (!sourceActor) return;

      // Segurança: Não deixar colocar um Refúgio dentro de outro
      if (sourceActor.type === 'refugio') {
        return ui.notifications.warn("Você não pode abrigar um Refúgio dentro de outro!");
      }

      // 2. Prepara os dados para criar o ITEM "Habitante"
      // Estamos tirando uma "foto" dos status atuais do personagem
      const habitanteData = {
        name: sourceActor.name,
        type: 'habitante', // O tipo de item que definimos no template.json
        img: sourceActor.img,
        system: {
          // Tenta pegar Arquétipo (Sobrevivente) ou Conceito (NPC) para a Função
          funcao: sourceActor.system.details?.archetype || sourceActor.system.details?.concept || "Sobrevivente",

          // Mapeia Vida (PV)
          saude: sourceActor.system.resources?.pv?.value ?? 10,
          maxSaude: sourceActor.system.resources?.pv?.max ?? 10,

          // Mapeia Infecção (Se tiver)
          infeccao: sourceActor.system.details?.infection ?? 0,

          // Adiciona uma nota automática da origem
          notas: `Registrado a partir de: ${sourceActor.name}`
        }
      };

      // 3. Cria o Item dentro do Refúgio
      return await this.actor.createEmbeddedDocuments("Item", [habitanteData]);
    }

    // ---------------------------------------------------------
    // COMPORTAMENTO PADRÃO (Arrastar Armas, Itens, etc.)
    // ---------------------------------------------------------
    return super._onDrop(event);
  }

  /* -------------------------------------------- */
  /* LISTENERS (Cliques e Interações)            */
  /* -------------------------------------------- */

  /** @override */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.roll-usage').click(this._onRollUsage.bind(this));

    // -------------------------------------------------------------
    // 1. LISTENERS GERAIS (Trava, Abas, Inputs)
    // -------------------------------------------------------------

    // Trava da Ficha
    html.find('.lock-btn').click(async (ev) => {
      ev.preventDefault();
      const currentState = this.actor.getFlag("extincao", "sheetLocked");
      await this.actor.setFlag("extincao", "sheetLocked", !currentState);
    });

    html.find('.level-up-btn').click(this._onLevelUp.bind(this));

    // Inputs de Bolinha (Inspecionar/Infecção)
    html.find('.stage-dot').click(async (ev) => {
      ev.preventDefault();
      const val = ev.currentTarget.dataset.value;
      await this.actor.update({ "system.details.infection": val });
    });

    // Inputs de Condição
    html.find('.condition-btn').click(async (ev) => {
      ev.preventDefault();
      const prop = ev.currentTarget.dataset.prop;
      const currentVal = this.actor.system.conditions?.[prop] || false;
      await this.actor.update({ [`system.conditions.${prop}`]: !currentVal });
    });
    // Listener do Combustível (Veículo)
    html.find('.roll-fuel').click(this._onRollFuel.bind(this));

    // BOTÃO DE TRAVA (CADEADO)
    html.find('.toggle-lock').click(this._onToggleLock.bind(this));

    // BOTÕES DE AJUSTE RÁPIDO (+/-)
    html.find('.adjust-resource').click(this._onAdjustResource.bind(this));
    // -------------------------------------------------------------
    // 2. GESTÃO DE RECURSOS (+ e -)
    // -------------------------------------------------------------

    // Vida e Resistência
    // 8. CONTROLES RÁPIDOS (+ e -)
    // Vida, Resistência e Tamanho da Horda
    html.find('.stat-control').click(async (ev) => {
      ev.preventDefault();
      const btn = ev.currentTarget;
      const target = btn.dataset.target; // 'pv', 'pr' ou 'tamanho'
      const isPlus = btn.classList.contains('plus');

      // 1. Tenta achar em Resources (Vida/Resistência)
      let path = `system.resources.${target}`;
      let resource = this.actor.system.resources[target];

      // 2. Se não achou, tenta em Attributes (Tamanho da Horda)
      if (!resource) {
        path = `system.attributes.${target}`;
        resource = this.actor.system.attributes[target];
      }

      if (!resource) return; // Segurança

      const current = Number(resource.value);
      const max = Number(resource.max);

      let novoValor = isPlus ? current + 1 : current - 1;
      novoValor = Math.clamp(novoValor, 0, max);

      await this.actor.update({ [`${path}.value`]: novoValor });
    });

    // Estresse (Botões + e -)
    html.find('.stress-control').click(async (ev) => {
      ev.preventDefault();
      const btn = ev.currentTarget;
      const isPlus = btn.classList.contains('plus');
      const current = Number(this.actor.system.resources.estresse.value);

      let novoValor = isPlus ? current + 1 : current - 1;
      novoValor = Math.clamp(novoValor, 0, 6); // Max 6

      await this.actor.update({ "system.resources.estresse.value": novoValor });
    });

    // Estresse (Clique direto na bolinha)
    html.find('.stress-box').click(async (ev) => {
      const idx = Number(ev.currentTarget.dataset.index);
      const current = this.actor.system.resources.estresse.value;
      const novoValor = idx === current ? idx - 1 : idx;
      await this.actor.update({ "system.resources.estresse.value": novoValor });
    });

    html.find('.item-open').click(ev => {
      ev.preventDefault(); // Impede comportamento padrão
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));

      // Agora o item.roll() vai existir porque registramos a classe ExtincaoItem!
      if (item) item.roll();
    });
    // Recuperar Estresse (Botão Ajuda)
    html.find('.recover-stress-btn').click(async (ev) => {
      ev.preventDefault();
      const estresseAtual = this.actor.system.resources.estresse.value;
      const targetId = this.actor.system.details.vinculo_target;

      let targetName = "seu Vínculo";
      if (targetId) {
        const targetActor = game.actors.get(targetId);
        if (targetActor) targetName = targetActor.name;
      }

      if (estresseAtual > 0) {
        await this.actor.update({ "system.resources.estresse.value": estresseAtual - 1 });
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: `
                <div class="extincao-roll">
                    <h3><i class="fas fa-hand-holding-heart"></i> AJUDA PRESTADA</h3>
                    <div style="text-align:center; margin: 5px 0; color:#ccc;">
                        Ajudou <strong>${targetName}</strong> e recuperou o foco.
                    </div>
                    <div class="roll-result success" style="font-size:1em;">-1 Estresse</div>
                </div>`
        });
      } else {
        ui.notifications.warn("Você está focado (0 Estresse).");
      }
    });

    // -------------------------------------------------------------
    // 3. ROLAGENS (Atributos, Perícias, Itens e NPCs)
    // -------------------------------------------------------------
    html.find('.rollable').click(ev => {
      ev.preventDefault();
      const element = ev.currentTarget;
      const dataset = element.dataset;

      // Se for Item (Ataque NPC ou Arma Sobrevivente)
      let item = null;
      if (dataset.rollType === 'item') {
        const itemId = element.closest(".item").dataset.itemId;
        item = this.actor.items.get(itemId);
      }

      this._processRoll(dataset, item);
    });

    // Mudança de Arquétipo
    html.find('select[name="system.details.archetype"]').change(async (ev) => {
      ev.preventDefault();
      const novoArquetipo = ev.currentTarget.value;
      const stats = EXTINCAO.ARQUETIPOS_STATS[novoArquetipo];
      if (stats) {
        const confirm = await Dialog.confirm({
          title: "Aplicar Arquétipo?",
          content: `<p>Mudar para <strong>${EXTINCAO.ARQUETIPOS[novoArquetipo]}</strong> redefinirá seus Atributos.</p>`
        });
        if (confirm) {
          await this.actor.update({
            "system.attributes.for.value": stats.for,
            "system.attributes.des.value": stats.des,
            "system.attributes.con.value": stats.con,
            "system.attributes.int.value": stats.int,
            "system.attributes.per.value": stats.per,
            "system.attributes.von.value": stats.von
          });
          ui.notifications.info(`Arquétipo aplicado!`);
        }
      }
    });

    // -------------------------------------------------------------
    // 4. GESTÃO DE ITENS (Criar, Editar, Deletar)
    // -------------------------------------------------------------

    // CRIAR ITEM (+ Novo)
    if (this.actor.isOwner) {
      html.find('.item-create').click(this._onItemCreate.bind(this));
    }

    // Deletar Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      Dialog.confirm({
        title: "Excluir Item?",
        content: `<p>Tem certeza que deseja excluir <strong>${item.name}</strong>?</p>`,
        yes: () => item.delete(),
        defaultYes: false
      });
    });

    // Editar Item (Janela)
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Edição Inline (NPC)
    html.find('.inline-edit').change(async ev => {
      ev.preventDefault();
      const input = ev.currentTarget;
      const el = input.closest('.item');
      const itemId = el.dataset.itemId;
      const field = input.dataset.field;
      const value = input.value;

      const item = this.actor.items.get(itemId);
      if (item) await item.update({ [field]: value });
    });

    // Limpar Vínculo
    html.find('.clear-link').click(async (ev) => {
      ev.preventDefault();
      const target = ev.currentTarget.dataset.target;
      await this.actor.update({ [`system.details.${target}_target`]: "" });
    });

    // -------------------------------------------------------------
    // 5. DRAG AND DROP
    // -------------------------------------------------------------
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }

    // 11. BOTÃO DA HORDA: ANUNCIAR REGRA
    html.find('.broadcast-rule-btn').click(ev => {
      ev.preventDefault();

      // Pega os dados atuais
      const dano = this.actor.system.attributes.dano.value;
      const forca = this.actor.system.attributes.forca.value;

      const content = `
            <div class="extincao-roll" style="border-left-color: #fb0;">
                <h3 style="color:#fb0"><i class="fas fa-biohazard"></i> ${this.actor.name}</h3>
                <div style="font-size: 0.9em; margin-bottom: 10px; color: #ccc;">
                    O enxame cerca vocês. A densidade é crítica.
                </div>
                
                <div class="roll-result failure" style="border-color: #b40; color: #f88; background: #210; font-size: 1.1em;">
                    DANO AUTOMÁTICO: ${dano}
                    <div style="font-size:0.5em; color:#966;">SE TERMINAR O TURNO PERTO</div>
                </div>

                <div style="background: #111; padding: 5px; border: 1px dashed #fb0; text-align: center; margin-top: 10px; color: #fb0;">
                    <strong>PARA ESCAPAR:</strong><br>
                    Teste de FORÇA ou ATLETISMO<br>
                    <span style="font-size: 1.2em; font-weight: bold;">DIFICULDADE 2</span>
                </div>
            </div>
        `;

      ChatMessage.create({
        content: content,
        speaker: ChatMessage.getSpeaker({ actor: this.actor })
      });
    });

    html.find('.stat-control').click(async (ev) => {
      ev.preventDefault();
      const btn = ev.currentTarget;
      const target = btn.dataset.target; // ex: 'defesa', 'recursos'
      const isPlus = btn.classList.contains('plus');

      // 1. Procura em Resources (Vida, Estresse - Sobrevivente)
      let path = `system.resources.${target}`;
      let resource = this.actor.system.resources?.[target];

      // 2. Se não achou, procura em Attributes (Defesa, Recursos - Refúgio/Horda)
      if (!resource) {
        path = `system.attributes.${target}`;
        resource = this.actor.system.attributes?.[target];
      }

      if (!resource) return; // Segurança

      const current = Number(resource.value);
      const max = Number(resource.max);

      // Calcula novo valor (respeitando min 0 e max)
      let novoValor = isPlus ? current + 1 : current - 1;
      novoValor = Math.max(0, Math.min(novoValor, max)); // Trava entre 0 e Max

      await this.actor.update({ [`${path}.value`]: novoValor });
    });
  }

  /* -------------------------------------------- */
  /* MÉTODOS AUXILIARES (ESSENCIAL)              */
  /* -------------------------------------------- */

  /**
   * Cria um novo item baseado no dataset do botão clicado
   * @param {Event} event 
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Pega o tipo (ex: "arma") do HTML data-type="arma"
    const type = header.dataset.type;
    console.log(`Criando novo item do tipo ${type}`);

    // Cria o objeto com um nome padrão bonito
    const itemData = {
      name: `Novo ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type: type,
      system: {}
    };

    // Cria no banco de dados
    return await Item.create(itemData, { parent: this.actor });
  }
  // --- MÉTODOS AUXILIARES ---

async _onToggleLock(event) {
    event.preventDefault();
    // Pega o estado atual e inverte
    const isLocked = this.actor.getFlag("extincao", "sheetLocked");
    await this.actor.setFlag("extincao", "sheetLocked", !isLocked);
  }

  /**
   * Ajusta valores (+/-) de PV, Estresse, etc.
   */
  async _onAdjustResource(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const resource = btn.dataset.resource; // ex: 'pv'
    const action = btn.dataset.action;     // 'plus' ou 'minus'

    let attrPath = "";
    
    // Identifica qual atributo estamos mexendo
    if (resource === 'pv') attrPath = "system.resources.pv.value";
    else if (resource === 'estresse') attrPath = "system.resources.estresse.value";
    else if (resource === 'pr') attrPath = "system.resources.pr.value";

    if (!attrPath) return;

    // Pega o valor atual
    const currentValue = Number(getProperty(this.actor, attrPath)) || 0;
    
    // Calcula o novo valor
    let newValue = currentValue;
    if (action === 'plus') newValue += 1;
    if (action === 'minus') newValue -= 1;

    // Se for PV, não deixa ficar negativo (opcional, mas bom pra veiculo)
    if (resource === 'pv' && newValue < 0) newValue = 0;

    // Atualiza o ator
    await this.actor.update({ [attrPath]: newValue });
  }

  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    if (dataset.rollType == "item") {
      const item = this.actor.items.get(element.closest("li").dataset.itemId);
      if (item) return item.roll();
    }

    this._processRoll(dataset);
  }

  async _onRollUsage(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    // Definição da Escala de Degradação (Pág 74)
    // Nota: O "-" (Infinito) não está aqui, então ele não rola.
    const usageSteps = ["d12", "d10", "d8", "d6", "d4", "0"];
    const currentUsage = item.system.uso;

    // Validação de Segurança
    if (!usageSteps.includes(currentUsage)) {
      return; // Se for infinito (-) ou inválido, não faz nada
    }

    if (currentUsage === "0") {
      return ui.notifications.warn("Click! A arma está vazia.");
    }

    // --- ROLAGEM ---
    const roll = await new Roll("1" + currentUsage).evaluate();
    if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);

    const result = roll.total;
    let newUsage = currentUsage;
    let message = "";
    let cssClass = "success";
    let title = "MUNIÇÃO ESTÁVEL";

    // Regra: 1 ou 2 diminui o dado
    if (result <= 2) {
      const currentIndex = usageSteps.indexOf(currentUsage);

      // Pega o próximo passo (Ex: d4 -> 0)
      if (currentIndex < usageSteps.length - 1) {
        newUsage = usageSteps[currentIndex + 1];
      }

      // Verifica se Zerou (Click da Morte)
      if (newUsage === "0") {
        title = "MUNIÇÃO ESGOTADA!";
        message = "A arma fez um clique seco. <strong>Está vazia.</strong>";
        cssClass = "failure";
      } else {
        title = "MUNIÇÃO REDUZIDA";
        message = `A reserva diminuiu. <br>Caiu de <strong>${currentUsage}</strong> para <strong>${newUsage}</strong>.`;
        cssClass = "warning";
      }

      // Salva a alteração
      await item.update({ "system.uso": newUsage });
    }
    else {
      message = `Disciplina de tiro. <br>Mantém em <strong>${currentUsage}</strong>.`;
    }

    // (O resto do código do ChatMessage continua igual...)
    // ...
    let borderColor = "#4da";
    if (cssClass === "warning") borderColor = "#ffaa00";
    if (cssClass === "failure") borderColor = "#ff4444";

    const content = `
    <div class="extincao-chat-card" style="border-left-color: ${borderColor};">
        <div style="display:flex; align-items:center; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">
            <img src="${item.img}" width="30" height="30" style="margin-right:10px; border:1px solid #444;">
            <h3 style="margin:0; color:${borderColor};">${title}</h3>
        </div>
        <div style="text-align:center; margin: 10px 0;">
            <span style="font-size: 0.8em; color: #888;">Rolagem de Uso (${currentUsage})</span>
            <div style="font-size: 2em; font-weight: bold; color: #eee;">[ ${result} ]</div>
        </div>
        <div style="font-size: 0.9em; color: #ccc; text-align: center;">${message}</div>
    </div>
    `;

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content
    });
  }

  /**
   * Processa a rolagem com Modal de Bônus e Regra de Desespero
   */
  /**
   * Processa a rolagem com Modal Estilizado (Dark)
   */
  async _processRoll(dataset, item = null) {
    return taskRoll(this.actor, dataset, item);
  }

  /**
     * Processa a evolução das perícias marcadas (Versão Visual Melhorada)
     */
  async _onLevelUp(event) {
    event.preventDefault();

    const confirm = await Dialog.confirm({
      title: "Finalizar Sessão?",
      content: "<p>Deseja evoluir todas as perícias marcadas com falha? (+1 Nível)</p>"
    });

    if (!confirm) return;

    const updates = {};
    const skills = this.actor.system.skills;
    let skillRows = "";
    let count = 0;

    for (let [key, skill] of Object.entries(skills)) {
      if (skill.failure) {
        updates[`system.skills.${key}.value`] = skill.value + 1;
        updates[`system.skills.${key}.failure`] = false;

        // --- CORREÇÃO DO NOME ---
        // Tenta traduzir. Se não achar, usa o Label da perícia ou formata a chave.
        let label = game.i18n.localize(`EXTINCAO.Skill.${key}`);
        if (label.startsWith("EXTINCAO.Skill.")) {
          label = skill.label || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        }

        // --- HTML DA LINHA DA PERÍCIA ---
        skillRows += `
                <div style="display: flex; justify-content: space-between; align-items: center; 
                            background: rgba(255, 255, 255, 0.03); padding: 6px 10px; margin-bottom: 4px; 
                            border-left: 3px solid #4da; border-radius: 0 4px 4px 0; border-bottom: 1px solid #222;">
                    <span style="font-weight: bold; color: #eee; text-transform: uppercase; font-size: 0.9em; letter-spacing: 0.5px;">
                        ${label}
                    </span>
                    <div style="color: #4da; font-family: monospace; font-weight: bold; font-size: 1.1em;">
                        <span style="color:#666;">${skill.value}</span>
                        <i class="fas fa-caret-right" style="color: #666; margin: 0 5px;"></i>
                        <span style="color:#4da; text-shadow: 0 0 5px rgba(77, 221, 170, 0.4);">${skill.value + 1}</span>
                    </div>
                </div>`;
        count++;
      }
    }

    if (count > 0) {
      await this.actor.update(updates);

      // --- HTML DO CARD COMPLETO ---
      const content = `
        <div class="extincao-chat-card" style="background: #080808; border: 1px solid #333; border-left: 4px solid #4da; box-shadow: 0 0 15px rgba(77, 221, 170, 0.1);">
            
            <div style="padding: 10px; background: linear-gradient(90deg, #111 0%, #050505 100%); border-bottom: 1px solid #333; display: flex; align-items: center;">
                <div style="background: #4da; color: #000; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; margin-right: 10px; box-shadow: 0 0 8px #4da;">
                    <i class="fas fa-level-up-alt"></i>
                </div>
                <div>
                    <h3 style="margin: 0; color: #4da; font-family: 'Courier New', monospace; font-size: 1.1em; letter-spacing: 1px; text-transform: uppercase;">
                        EVOLUÇÃO REGISTRADA
                    </h3>
                    <div style="font-size: 0.65em; color: #666;">PROTOCOLO DE APRENDIZADO</div>
                </div>
            </div>

            <div style="padding: 12px; color: #ccc; font-family: 'Segoe UI', sans-serif; font-size: 0.9em;">
                <div style="margin-bottom: 12px; font-style: italic; color: #888; border-bottom: 1px dashed #333; padding-bottom: 8px;">
                    "O que não te mata, te torna mais letal."
                    <br>O sobrevivente assimilou novas técnicas:
                </div>
                
                ${skillRows}
                
                <div style="margin-top: 15px; text-align: right; font-size: 0.75em; color: #555;">
                    <i class="fas fa-check-circle"></i> SESSÃO FINALIZADA
                </div>
            </div>
        </div>`;

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: content
      });
    } else {
      ui.notifications.info("Nenhuma perícia marcada para evolução.");
    }
  }

  /**
   * Rola o Teste de Combustível (Pág 16)
   * 1-2: Baixa o nível / 3-6: Mantém
   */
  async _onRollFuel(event) {
    event.preventDefault();

    // Mapa dos níveis de combustível
    const fuelLevels = ["cheio", "meio", "reserva", "seco"];
    const currentFuel = this.actor.system.resources.fuel || "cheio";

    if (currentFuel === "seco") {
      return ui.notifications.warn("O tanque já está seco!");
    }

    // Rola 1d6
    const roll = await new Roll("1d6").evaluate();
    if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);

    const result = roll.total;
    let newFuel = currentFuel;
    let message = "";
    let cssClass = "success";

    // Regra Pág 16: 1 ou 2 consome combustível
    if (result <= 2) {
      const currentIndex = fuelLevels.indexOf(currentFuel);
      if (currentIndex < fuelLevels.length - 1) {
        newFuel = fuelLevels[currentIndex + 1];
      }

      message = `Consumo alto na viagem. <br>Nível caiu de <strong>${currentFuel.toUpperCase()}</strong> para <strong>${newFuel.toUpperCase()}</strong>.`;
      cssClass = "failure";

      // Atualiza o ator
      await this.actor.update({ "system.resources.fuel": newFuel });
    } else {
      message = `Viagem econômica. <br>Nível mantém em <strong>${currentFuel.toUpperCase()}</strong>.`;
    }

    // Chat Card
    const content = `
    <div class="extincao-chat-card" style="border-left-color: #ffaa00;">
        <h3><i class="fas fa-gas-pump"></i> TESTE DE COMBUSTÍVEL</h3>
        <div style="text-align:center; font-size:2em; font-weight:bold; margin:10px 0;">[ ${result} ]</div>
        <div style="text-align:center; color:#ccc;">${message}</div>
    </div>`;

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content
    });
  }
}