import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { EXTINCAO } from "../helpers/config.mjs";

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
    if (actorData.type == 'sobrevivente' || actorData.type == 'character' || actorData.type == 'npc' || actorData.type == 'refugio') {
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

    return context;
  }

  /**
   * Organiza os itens em categorias
   */
  _prepareItems(context) {
    const armas = [];
    const equipamentos = [];
    const itens = [];
    const qualidades = [];
    const habitantes = [];

    for (let i of context.items) {
      i.img = i.img || "icons/svg/item-bag.svg";
      if (i.type === 'arma') { armas.push(i); }
      else if (i.type === 'equipamento') { equipamentos.push(i); }
      else if (i.type === 'qualidade' || i.type === 'defeito') { qualidades.push(i); }
      else if (i.type === 'projeto') { projetos.push(i); }

      // SE FOR HABITANTE, VAI PARA A LISTA DE GENTE
      else if (i.type === 'habitante') {
        i.img = i.img || "icons/svg/mystery-man.svg"; // Ícone padrão de pessoa
        habitantes.push(i);
      }
    }

    context.armas = armas;
    context.equipamentos = equipamentos;
    context.itens = itens;
    context.qualidades = qualidades;
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

    // -------------------------------------------------------------
    // 1. LISTENERS GERAIS (Trava, Abas, Inputs)
    // -------------------------------------------------------------

    // Trava da Ficha
    html.find('.lock-btn').click(async (ev) => {
      ev.preventDefault();
      const currentState = this.actor.getFlag("extincao", "sheetLocked");
      await this.actor.setFlag("extincao", "sheetLocked", !currentState);
    });

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

  async _processRoll(dataset, item = null) {
    // 1. Definições Iniciais
    let diceCount = 0;
    let label = dataset.label || "Rolagem";
    let damageInfo = "";

    // PADRÃO: Ninguém é especialista até provar o contrário (Perícia >= 4)
    let isSpecialist = false;

    const SKILL_MAP = {
      "briga": "for", "armas_brancas": "for", "atletismo": "for",
      "armas_fogo": "des", "furtividade": "des", "pilotagem": "des", "ladinagem": "des", "esquiva": "des",
      "vigor": "con",
      "medicina": "int", "tecnologia": "int", "investigacao": "int", "sobrevivencia": "int", "ciencias": "int",
      "percepcao": "per", "atencao": "per", "intuicao": "per",
      "lideranca": "von", "adestramento": "von", "intimidacao": "von", "diplomacia": "von"
    };

    // ====================================================
    // A. ROLAGEM DE PERÍCIA (Sobrevivente)
    // ====================================================
    if (dataset.rollType === 'skill') {
      const skillKey = dataset.key;
      const skill = this.actor.system.skills[skillKey];
      const attrKey = SKILL_MAP[skillKey] || "int";
      const attributeValue = this.actor.system.attributes[attrKey]?.value || 0;

      // Pool = Atributo + Perícia
      diceCount = attributeValue + skill.value;

      // LÓGICA ESPECIALISTA: SÓ ATIVA AQUI!
      // Se a PERÍCIA for >= 4, ativa o bônus.
      if (skill.value >= 4) {
        isSpecialist = true;
      }

      label = `${label} (${attributeValue.toString().toUpperCase()} + ${skill.value})`;
    }

    // ====================================================
    // B. ROLAGEM DE ATRIBUTO / DEFESA (Geral)
    // ====================================================
    else if (dataset.key) {
      // Se rolar Inteligência 5 puro, NÃO é especialista.
      diceCount = this.actor.system.attributes[dataset.key]?.value || 0;
      isSpecialist = false; // Garante que atributo puro nunca ativa
    }

    // ====================================================
    // C. ROLAGEM DE ITEM / ATAQUE NPC
    // ====================================================
    else if (dataset.rollType === 'item' && item) {
      diceCount = Number(item.system.bonus) || 1;
      const damage = item.system.dano || "0";

      label = `Ataque: ${item.name}`;
      damageInfo = damage;
      isSpecialist = false; // Itens rolam normal (6)
    }

    // ====================================================
    // D. ROLAGEM DE NPC SIMPLES
    // ====================================================
    else if (dataset.rollType === 'npc-attack') {
      diceCount = this.actor.system.attributes.attack.value || 1;
      damageInfo = this.actor.system.attributes.damage.value || "1";
      isSpecialist = false;
    } else if (dataset.rollType === 'npc-defense') {
      diceCount = this.actor.system.attributes.defense.value || 1;
      isSpecialist = false;
    }

    if (diceCount < 1) diceCount = 1;

    // Define o alvo baseado na flag
    const targetNumber = isSpecialist ? 5 : 6;

    // 2. Executar Rolagem
    let roll = new Roll(`${diceCount}d6`);
    await roll.evaluate();

    if (game.dice3d) { game.dice3d.showForRoll(roll, game.user, true); }

    // 3. Analisar Resultados
    const diceResults = roll.terms[0].results;
    let successCount = 0;
    let onesCount = 0;
    let hasCrit = false;
    let diceHTML = "";

    for (let die of diceResults) {
      const val = die.result;
      let cssClass = "";

      if (val === 6) {
        successCount++;
        hasCrit = true;
        cssClass = "crit"; // Verde Neon
      } else if (val >= targetNumber) {
        successCount++;
        cssClass = "success"; // Verde Suave (só acontece se target for 5)
      } else if (val === 1) {
        onesCount++;
        cssClass = "glitch"; // Vermelho
      }
      diceHTML += `<span class="mini-die ${cssClass}">${val}</span>`;
    }

    // 4. Montar HTML
    let outcomeHTML = "";
    let borderSideColor = "#666";
    let pushButton = "";

    if (successCount > 0) {
      borderSideColor = "#4eff8c";
      if (this.actor.type === 'npc') borderSideColor = "#f44";

      const critText = hasCrit ? `<div style="font-size:0.6em; color:#fff; letter-spacing:2px; border-top:1px dashed #444; margin-top:5px; padding-top:2px;">CRÍTICO!</div>` : "";

      let damageHtml = "";
      if (damageInfo && damageInfo !== "0") {
        damageHtml = `<div style="margin-top:5px; border-top:1px solid #333; padding-top:2px; font-weight:bold; color:${this.actor.type === 'npc' ? '#f44' : '#ccc'}">DANO: ${damageInfo}</div>`;
      }

      outcomeHTML = `
                <div class="roll-result success" style="${this.actor.type === 'npc' ? 'color:#f44; border-color:#f44; background:#210;' : ''}">
                    ${successCount} SUCESSO(S)
                    ${critText}
                </div>
                ${damageHtml}
            `;
    } else {
      if (onesCount > 0) {
        borderSideColor = "#f44";
        outcomeHTML = `
                    <div class="roll-result failure" style="color:#f44; border-color:#f44;">GLITCH!</div>
                    <div class="roll-summary glitch-text">Algo deu muito errado...</div>`;
      } else {
        outcomeHTML = `<div class="roll-result failure">FALHA</div>`;
      }

      // BOTÃO DE FORÇAR (Apenas Sobrevivente)
      if (this.actor.type === 'sobrevivente') {
        const rollData = {
          actorId: this.actor.id,
          diceCount: diceCount,
          targetNumber: targetNumber,
          label: label
        };
        const dataString = JSON.stringify(rollData).replace(/"/g, '&quot;');

        pushButton = `
                    <div style="margin-top: 10px; text-align: center;">
                        <button class="force-roll-btn" data-roll="${dataString}">
                            <i class="fas fa-bolt"></i> FORÇAR (+1 Estresse)
                        </button>
                    </div>
                `;
      }
    }

    let specialistHint = isSpecialist ? `<div style="font-size:0.7em; color:#4eff8c; margin-bottom:5px;">[ESPECIALISTA: 5+ É SUCESSO]</div>` : "";

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
            <div class="extincao-roll" style="border-left-color: ${borderSideColor}">
                <h3>${label}</h3>
                ${specialistHint}
                
                <div class="dice-pool">
                    ${diceHTML}
                </div>

                ${outcomeHTML}
                ${pushButton}
            </div>`
    });
  }
}