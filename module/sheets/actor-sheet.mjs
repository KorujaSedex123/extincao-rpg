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
    if (this.actor.type === 'horda') return "systems/extincao/templates/actor/actor-horda-sheet.hbs";
    if (this.actor.type === 'npc') return "systems/extincao/templates/actor/actor-npc-sheet.hbs";
    if (this.actor.type === 'sobrevivente' || this.actor.type === 'character') return "systems/extincao/templates/actor/actor-sobrevivente-sheet.hbs";
    if (this.actor.type === 'refugio') return "systems/extincao/templates/actor/actor-refugio-sheet.hbs";
    if (this.actor.type === 'veiculo') return "systems/extincao/templates/actor/actor-veiculo-sheet.hbs";
    return "systems/extincao/templates/actor/actor-sobrevivente-sheet.hbs";
  }

  /** @override */
  async getData() {
    const context = super.getData();
    const actorData = this.document.toObject(false);

    context.system = actorData.system;
    context.flags = actorData.flags;
    context.isLocked = this.actor.getFlag("extincao", "sheetLocked") || false;

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

    context.skillColumns = [
      { key: "combate", label: "COMBATE", skills: ["armas_fogo", "armas_brancas", "briga", "esquiva"] },
      { key: "sobrevivencia", label: "SOBREVIVÊNCIA", skills: ["atletismo", "furtividade", "atencao", "sobrevivencia", "pilotagem"] },
      { key: "tecnica", label: "TÉCNICA", skills: ["primeiros_socorros", "medicina", "mecanica", "eletronica", "social"] }
    ];

    if (['sobrevivente', 'character', 'npc', 'refugio', 'veiculo'].includes(actorData.type)) {
      this._prepareItems(context);
    }

    if (context.system.details?.vinculo_target) context.vinculoActor = game.actors.get(context.system.details.vinculo_target);
    if (context.system.details?.atrito_target) context.atritoActor = game.actors.get(context.system.details.atrito_target);

    context.rollData = context.actor.getRollData();
    context.effects = prepareActiveEffectCategories(this.actor.effects);
    context.arquetipos = EXTINCAO.ARQUETIPOS;

    const editorClass = foundry.applications?.ux?.TextEditor ?? TextEditor;
    context.enrichedBiography = await editorClass.enrichHTML(this.actor.system.details?.biography || "", { async: true, relativeTo: this.actor });

    return context;
  }

  /**
   * ROLAGEM INTELIGENTE DE ITEM (Arma vs Utilitário)
   */
  async _onItemRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    // A. É UMA ARMA? PREPARA O ATAQUE
    if (item.type === "arma") {
      let skillKey = "briga"; // Fallback padrão

      // Tenta adivinhar a perícia pelo nome ou tipo
      const name = item.name.toLowerCase();
      const type = (item.system.tipo || "").toLowerCase();

      // Lógica de Detecção
      if (name.includes("pistola") || name.includes("rifle") || name.includes("escopeta") || name.includes("fuzil") || name.includes("revólver") || type.includes("fogo")) {
        skillKey = "armas_fogo";
      }
      else if (name.includes("faca") || name.includes("facão") || name.includes("machado") || name.includes("taco") || name.includes("espada") || type.includes("branca")) {
        skillKey = "armas_brancas";
      }
      else if (name.includes("arco") || name.includes("besta")) {
        skillKey = "armas_fogo";
      }

      // Importa e chama o dado
      const dice = await import("../helpers/dice.mjs");
      dice.taskRoll(this.actor, {
        rollType: 'skill',
        key: skillKey,
        label: `Ataque com ${item.name}`
      }, item);
    }

    // B. É OUTRO ITEM? MOSTRA O CARD
    else {
      const desc = item.system.description || "Sem descrição.";
      const content = `
        <div class="extincao-chat-card" style="background: #111; border: 1px solid #333; color: #ccc;">
            <div style="background: #222; padding: 5px; border-bottom: 1px solid #444; display:flex; align-items:center;">
                <img src="${item.img}" width="36" height="36" style="margin-right:10px; border:1px solid #000;">
                <h3 style="margin:0; color: #4da;">${item.name}</h3>
            </div>
            <div style="padding: 10px; font-size: 0.9em; line-height: 1.4;">${desc}</div>
        </div>`;

      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: content
      });
    }
  }

  _prepareItems(context) {
    const armas = [], equipamentos = [], itens = [], qualidades = [], projetos = [], habitantes = [];

    for (let i of context.items) {
      i.img = i.img || "icons/svg/item-bag.svg";
      if (i.type === 'arma') armas.push(i);
      else if (i.type === 'equipamento') equipamentos.push(i);
      else if (i.type === 'qualidade' || i.type === 'defeito') qualidades.push(i);
      else if (i.type === 'habitante') { i.img = i.img || "icons/svg/mystery-man.svg"; habitantes.push(i); }
      else if (i.type === 'projeto') projetos.push(i);
      else itens.push(i);
    }

    context.armas = armas;
    context.equipamentos = equipamentos;
    context.itens = itens;
    context.qualidades = qualidades;
    context.projetos = projetos;
    context.habitantes = habitantes;
  }

  /** @override */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const actor = this.actor;

    // --- LÓGICA DE PASSAGEIROS / HABITANTES (Veículo e Refúgio) ---
    // Agora aceita drop em VEÍCULOS também!
    if ((actor.type === 'refugio' || actor.type === 'veiculo') && data.type === 'Actor') {

      const sourceActor = await fromUuid(data.uuid);
      if (!sourceActor) return;

      // Segurança: Não colocar estruturas dentro de estruturas
      if (sourceActor.type === 'refugio' || sourceActor.type === 'veiculo') {
        return ui.notifications.warn("Este ator não pode ser um passageiro/habitante!");
      }

      // Define a "Função" padrão baseada no tipo de ficha
      let funcaoPadrao = "Sobrevivente";
      if (actor.type === 'veiculo') funcaoPadrao = "Passageiro";

      // Prepara os dados do Item "Habitante" (que representa o passageiro)
      const habitanteData = {
        name: sourceActor.name,
        type: 'habitante', // Usamos o mesmo tipo de item 'habitante' para passageiros
        img: sourceActor.img,
        system: {
          funcao: sourceActor.system.details?.archetype || funcaoPadrao,

          // Snapshot dos Status Atuais
          saude: sourceActor.system.resources?.pv?.value ?? 10,
          maxSaude: sourceActor.system.resources?.pv?.max ?? 10,

          // Importante salvar Estresse para monitorar a sanidade do grupo no carro
          estresse: sourceActor.system.resources?.estresse?.value ?? 0,

          infeccao: sourceActor.system.details?.infection ?? 0,

          // Salva o UUID para podermos abrir a ficha original depois!
          originalActorId: sourceActor.uuid,

          notas: `Embarcou em: ${new Date().toLocaleTimeString()}`
        }
      };

      // Cria o item dentro do Veículo/Refúgio
      return await this.actor.createEmbeddedDocuments("Item", [habitanteData]);
    }

    // ---------------------------------------------------------
    // COMPORTAMENTO PADRÃO (Arrastar Armas, Itens, etc.)
    // ---------------------------------------------------------
    return super._onDrop(event);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('.roll-usage').click(this._onRollUsage.bind(this));

    // Novo listener para rolar itens (armas/equipamentos)
    html.find('.item-roll').click(this._onItemRoll.bind(this));

    html.find('.lock-btn').click(async (ev) => {
      ev.preventDefault();
      const currentState = this.actor.getFlag("extincao", "sheetLocked");
      await this.actor.setFlag("extincao", "sheetLocked", !currentState);
    });

    html.find('.level-up-btn').click(this._onLevelUp.bind(this));

    html.find('.stage-dot').click(async (ev) => {
      ev.preventDefault();
      const val = ev.currentTarget.dataset.value;
      await this.actor.update({ "system.details.infection": val });
    });

    html.find('.condition-btn').click(async (ev) => {
      ev.preventDefault();
      const prop = ev.currentTarget.dataset.prop;
      const currentVal = this.actor.system.conditions?.[prop] || false;
      await this.actor.update({ [`system.conditions.${prop}`]: !currentVal });
    });

    html.find('.roll-fuel').click(this._onRollFuel.bind(this));
    html.find('.toggle-lock').click(this._onToggleLock.bind(this));
    html.find('.adjust-resource').click(this._onAdjustResource.bind(this));

    html.find('.stat-control').click(async (ev) => {
      ev.preventDefault();
      const btn = ev.currentTarget;
      const target = btn.dataset.target;
      const isPlus = btn.classList.contains('plus');
      let path = `system.resources.${target}`;
      let resource = this.actor.system.resources[target];
      if (!resource) {
        path = `system.attributes.${target}`;
        resource = this.actor.system.attributes[target];
      }
      if (!resource) return;
      const current = Number(resource.value);
      const max = Number(resource.max);
      let novoValor = isPlus ? current + 1 : current - 1;
      novoValor = Math.max(0, Math.min(novoValor, max));
      await this.actor.update({ [`${path}.value`]: novoValor });
    });

    html.find('.stress-control').click(async (ev) => {
      ev.preventDefault();
      const btn = ev.currentTarget;
      const isPlus = btn.classList.contains('plus');
      const current = Number(this.actor.system.resources.estresse.value);
      let novoValor = isPlus ? current + 1 : current - 1;
      novoValor = Math.max(0, Math.min(novoValor, 6));
      await this.actor.update({ "system.resources.estresse.value": novoValor });
    });

    html.find('.stress-box').click(async (ev) => {
      const idx = Number(ev.currentTarget.dataset.index);
      const current = this.actor.system.resources.estresse.value;
      const novoValor = idx === current ? idx - 1 : idx;
      await this.actor.update({ "system.resources.estresse.value": novoValor });
    });

    html.find('.item-open').click(ev => {
      ev.preventDefault();
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) item.sheet.render(true);
    });

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
          content: `<div class="extincao-roll"><h3><i class="fas fa-hand-holding-heart"></i> AJUDA PRESTADA</h3><div style="text-align:center; margin: 5px 0; color:#ccc;">Ajudou <strong>${targetName}</strong> e recuperou o foco.</div><div class="roll-result success" style="font-size:1em;">-1 Estresse</div></div>`
        });
      } else {
        ui.notifications.warn("Você está focado (0 Estresse).");
      }
    });

    // TOGGLE MOTORISTA (Corrigido com Flags)
    html.find('.driver-toggle').click(async (ev) => {
      ev.preventDefault();
      const btn = ev.currentTarget;
      const li = btn.closest(".item");
      const itemId = li.dataset.itemId;
      const item = this.actor.items.get(itemId);

      // Pega o estado atual da memória (Flag)
      const isDriver = item.getFlag("extincao", "isDriver") || false;

      // Se for ativar este motorista, desativa os outros primeiro
      if (!isDriver) {
        const outros = this.actor.items.filter(i => i.type === 'habitante' && i.id !== item.id);
        for (let outro of outros) {
          // Se tiver a flag, remove
          if (outro.getFlag("extincao", "isDriver")) {
            await outro.unsetFlag("extincao", "isDriver");
          }
        }
      }

      // Salva o novo estado
      await item.setFlag("extincao", "isDriver", !isDriver);
    });

    html.find('.rollable').click(ev => {
      ev.preventDefault();
      const element = ev.currentTarget;
      const dataset = element.dataset;
      let item = null;
      if (dataset.rollType === 'item') {
        const itemId = element.closest(".item").dataset.itemId;
        item = this.actor.items.get(itemId);
      }
      this._processRoll(dataset, item);
    });

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

    if (this.actor.isOwner) {
      html.find('.item-create').click(this._onItemCreate.bind(this));
    }

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

    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

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

    html.find('.clear-link').click(async (ev) => {
      ev.preventDefault();
      const target = ev.currentTarget.dataset.target;
      await this.actor.update({ [`system.details.${target}_target`]: "" });
    });

    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }

    html.find('.broadcast-rule-btn').click(ev => {
      ev.preventDefault();
      const dano = this.actor.system.attributes.dano.value;
      const content = `<div class="extincao-roll" style="border-left-color: #fb0;"><h3 style="color:#fb0"><i class="fas fa-biohazard"></i> ${this.actor.name}</h3><div style="font-size: 0.9em; margin-bottom: 10px; color: #ccc;">O enxame cerca vocês. A densidade é crítica.</div><div class="roll-result failure" style="border-color: #b40; color: #f88; background: #210; font-size: 1.1em;">DANO AUTOMÁTICO: ${dano}<div style="font-size:0.5em; color:#966;">SE TERMINAR O TURNO PERTO</div></div><div style="background: #111; padding: 5px; border: 1px dashed #fb0; text-align: center; margin-top: 10px; color: #fb0;"><strong>PARA ESCAPAR:</strong><br>Teste de FORÇA ou ATLETISMO<br><span style="font-size: 1.2em; font-weight: bold;">DIFICULDADE 2</span></div></div>`;
      ChatMessage.create({ content: content, speaker: ChatMessage.getSpeaker({ actor: this.actor }) });
    });

    html.find('.roll-npc-attack').click(async (ev) => {
      ev.preventDefault();
      const btn = ev.currentTarget;

      // Se for um item real (lista), usamos a lógica de item
      const li = btn.closest(".item");
      if (li && li.dataset.itemId) {
        const item = this.actor.items.get(li.dataset.itemId);
        // Chama a rolagem inteligente de item
        const dice = await import("../helpers/dice.mjs");
        // Se o item tiver dados de dano/bonus, a taskRoll pega
        // Mas para garantir, podemos passar dados estáticos se for um ataque simples
        return dice.taskRoll(this.actor, {
          rollType: 'skill', // Tenta achar skill, senão usa dados base do item se houver
          key: 'briga',      // Fallback
          label: `Ataque: ${item.name}`
        }, item);
      }

      // Se for o ATAQUE BÁSICO do NPC (Campos fixos na ficha)
      // Precisamos pegar os valores dos inputs próximos ou do actor data
      const diceCount = this.actor.system.combat?.attack?.value || 0;
      const damage = this.actor.system.combat?.damage?.value || 0; // Se você tiver esse campo
      // OU se os dados estiverem no botão (recomendado se você editou o HBS)
      // const diceCount = btn.dataset.dice;

      // IMPORTANTE: Como os campos de ataque do NPC não são itens, 
      // vamos montar um "Objeto Item Falso" para a função de rolagem entender o dano.

      const fakeItem = {
        name: "Ataque Básico",
        system: {
          dano: damage,
          bonus: 0
        }
      };

      const dice = await import("../helpers/dice.mjs");
      dice.taskRoll(this.actor, {
        rollType: 'static', // Novo modo que criamos
        dice: diceCount,
        label: "Ataque do NPC",
        damage: damage      // Passa dano direto também
      }, fakeItem);
    });
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const itemData = {
      name: `Novo ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type: type,
      system: {}
    };
    return await Item.create(itemData, { parent: this.actor });
  }

  async _onToggleLock(event) {
    event.preventDefault();
    const isLocked = this.actor.getFlag("extincao", "sheetLocked");
    await this.actor.setFlag("extincao", "sheetLocked", !isLocked);
  }

  async _onAdjustResource(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const resource = btn.dataset.resource;
    const action = btn.dataset.action;
    let attrPath = "";
    if (resource === 'pv') attrPath = "system.resources.pv.value";
    else if (resource === 'estresse') attrPath = "system.resources.estresse.value";
    else if (resource === 'pr') attrPath = "system.resources.pr.value";
    if (!attrPath) return;
    const currentValue = Number(getProperty(this.actor, attrPath)) || 0;
    let newValue = currentValue;
    if (action === 'plus') newValue += 1;
    if (action === 'minus') newValue -= 1;
    if (resource === 'pv' && newValue < 0) newValue = 0;
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

    const usageSteps = ["d12", "d10", "d8", "d6", "d4", "0"];
    const currentUsage = item.system.uso;
    if (!usageSteps.includes(currentUsage)) return;
    if (currentUsage === "0") return ui.notifications.warn("Click! A arma está vazia.");

    const roll = await new Roll("1" + currentUsage).evaluate();
    if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);

    const result = roll.total;
    let newUsage = currentUsage;
    let message = "", cssClass = "success", title = "MUNIÇÃO ESTÁVEL";

    if (result <= 2) {
      const currentIndex = usageSteps.indexOf(currentUsage);
      if (currentIndex < usageSteps.length - 1) newUsage = usageSteps[currentIndex + 1];
      if (newUsage === "0") {
        title = "MUNIÇÃO ESGOTADA!";
        message = "A arma fez um clique seco. <strong>Está vazia.</strong>";
        cssClass = "failure";
      } else {
        title = "MUNIÇÃO REDUZIDA";
        message = `A reserva diminuiu. <br>Caiu de <strong>${currentUsage}</strong> para <strong>${newUsage}</strong>.`;
        cssClass = "warning";
      }
      await item.update({ "system.uso": newUsage });
    } else {
      message = `Disciplina de tiro. <br>Mantém em <strong>${currentUsage}</strong>.`;
    }

    let borderColor = cssClass === "warning" ? "#ffaa00" : (cssClass === "failure" ? "#ff4444" : "#4da");
    const content = `<div class="extincao-chat-card" style="border-left-color: ${borderColor};"><div style="display:flex; align-items:center; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;"><img src="${item.img}" width="30" height="30" style="margin-right:10px; border:1px solid #444;"><h3 style="margin:0; color:${borderColor};">${title}</h3></div><div style="text-align:center; margin: 10px 0;"><span style="font-size: 0.8em; color: #888;">Rolagem de Uso (${currentUsage})</span><div style="font-size: 2em; font-weight: bold; color: #eee;">[ ${result} ]</div></div><div style="font-size: 0.9em; color: #ccc; text-align: center;">${message}</div></div>`;
    ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: content });
  }

  async _processRoll(dataset, item = null) {
    return taskRoll(this.actor, dataset, item);
  }

  async _onLevelUp(event) {
    event.preventDefault();
    const confirm = await Dialog.confirm({
      title: "Consolidar Aprendizado?",
      content: "<p>Isso converterá todas as <strong>Falhas Marcadas</strong> em <strong>Experiência</strong>.</p><p>Se a meta de pontos for atingida, o nível subirá automaticamente.</p>"
    });
    if (!confirm) return;

    const updates = {};
    const skillXP = this.actor.getFlag("extincao", "skillXP") || {};
    let saveFlags = false;
    const costs = [3, 5, 10, 15, 20];
    let skillRows = "";
    let count = 0;
    const skills = this.actor.system.skills;

    for (let [key, skill] of Object.entries(skills)) {
      if (skill.falha || skill.failure) {
        updates[`system.skills.${key}.falha`] = false;
        updates[`system.skills.${key}.failure`] = false;
        let currentXP = skillXP[key] || 0;
        currentXP++;
        const currentLevel = skill.value;
        const costNeeded = costs[currentLevel] || 20;
        let leveledUp = false;
        if (currentXP >= costNeeded) {
          updates[`system.skills.${key}.value`] = currentLevel + 1;
          currentXP = 0;
          leveledUp = true;
        }
        skillXP[key] = currentXP;
        saveFlags = true;
        let label = game.i18n.localize(`EXTINCAO.Skill.${key}`);
        if (label.startsWith("EXTINCAO.Skill.")) label = skill.label || key;
        let status = leveledUp ? `<span style="color:#4eff8c; font-weight:bold; text-shadow: 0 0 5px #4eff8c;"><i class="fas fa-arrow-up"></i> NÍVEL ${currentLevel + 1}!</span>` : `<span style="color:#aaa;">${currentXP} / ${costNeeded} pts (${Math.round((currentXP / costNeeded) * 100)}%)</span>`;
        skillRows += `<div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.05); padding: 5px 10px; margin-bottom: 4px; border-left: 3px solid ${leveledUp ? '#4eff8c' : '#ffaa00'}; border-radius: 4px;"><div style="font-weight: bold; color: #eee;">${label}</div><div style="text-align:right; font-size: 0.9em;">${status}</div></div>`;
        count++;
      }
    }

    if (count > 0) {
      await this.actor.update(updates);
      if (saveFlags) await this.actor.setFlag("extincao", "skillXP", skillXP);
      const content = `<div class="extincao-chat-card" style="background: #111; border: 1px solid #444; border-top: 3px solid #ffaa00;"><div style="padding: 10px; border-bottom: 1px solid #333; display: flex; align-items: center;"><div style="background: #ffaa00; color: #000; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-right: 10px;"><i class="fas fa-brain"></i></div><div><h3 style="margin: 0; color: #eee;">APRENDIZADO</h3><div style="font-size: 0.7em; color: #aaa;">RELATÓRIO DE XP</div></div></div><div style="padding: 10px; font-family: 'Segoe UI', sans-serif;">${skillRows}</div></div>`;
      ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: content });
    } else {
      ui.notifications.info("Nenhuma falha marcada para processar.");
    }
  }

  async _onRollFuel(event) {
    event.preventDefault();
    const fuelLevels = ["cheio", "meio", "reserva", "seco"];
    const currentFuel = this.actor.system.resources.fuel || "cheio";
    if (currentFuel === "seco") return ui.notifications.warn("O tanque já está seco!");

    const roll = await new Roll("1d6").evaluate();
    if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);
    const result = roll.total;
    let newFuel = currentFuel;
    let message = "";
    let cssClass = "success";

    if (result <= 2) {
      const currentIndex = fuelLevels.indexOf(currentFuel);
      if (currentIndex < fuelLevels.length - 1) newFuel = fuelLevels[currentIndex + 1];
      message = `Consumo alto na viagem. <br>Nível caiu de <strong>${currentFuel.toUpperCase()}</strong> para <strong>${newFuel.toUpperCase()}</strong>.`;
      cssClass = "failure";
      await this.actor.update({ "system.resources.fuel": newFuel });
    } else {
      message = `Viagem econômica. <br>Nível mantém em <strong>${currentFuel.toUpperCase()}</strong>.`;
    }

    const content = `<div class="extincao-chat-card" style="border-left-color: #ffaa00;"><h3><i class="fas fa-gas-pump"></i> TESTE DE COMBUSTÍVEL</h3><div style="text-align:center; font-size:2em; font-weight:bold; margin:10px 0;">[ ${result} ]</div><div style="text-align:center; color:#ccc;">${message}</div></div>`;
    ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: content });
  }
}