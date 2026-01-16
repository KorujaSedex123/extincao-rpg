import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { EXTINCAO } from "../helpers/config.mjs";

export class BoilerplateActorSheet extends ActorSheet {

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
    return `systems/extincao/templates/actor/actor-${this.actor.type}-sheet.hbs`;
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
    if (actorData.type == 'sobrevivente' || actorData.type == 'character') {
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

    for (let i of context.items) {
      i.img = i.img || "icons/svg/item-bag.svg";
      if (i.type === 'arma') { armas.push(i); }
      else if (i.type === 'equipamento') { equipamentos.push(i); }
      else if (i.type === 'qualidade' || i.type === 'defeito') { qualidades.push(i); }
      else { itens.push(i); }
    }

    context.armas = armas;
    context.equipamentos = equipamentos;
    context.itens = itens;
    context.qualidades = qualidades;
  }

  /* -------------------------------------------- */
  /* DRAG AND DROP HANDLER (CORRIGIDO)           */
  /* -------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    let data;
    try {
      // Lê o JSON direto do evento
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (err) {
      return false;
    }

    // Verifica se soltou dentro das nossas zonas de drop
    const dropZone = event.target.closest(".drop-zone");

    // Se soltou um ATOR dentro de uma ZONA DE DROP
    if (dropZone && data.type === "Actor") {
      const connectionType = dropZone.dataset.connection; // "vinculo" ou "atrito"

      // Pega o Ator arrastado
      const draggedActor = await fromUuid(data.uuid);

      if (draggedActor) {
        // Salva o ID do ator no campo correto
        await this.actor.update({
          [`system.details.${connectionType}_target`]: draggedActor.id
        });
        return; // Interrompe o processo padrão
      }
    }

    // Se não foi nas zonas especiais, deixa o Foundry fazer o padrão
    super._onDrop(event);
  }

  /* -------------------------------------------- */
  /* LISTENERS (Cliques e Interações)            */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 1. TRAVA
    html.find('.lock-btn').click(async (ev) => {
      ev.preventDefault();
      const currentState = this.actor.getFlag("extincao", "sheetLocked");
      await this.actor.setFlag("extincao", "sheetLocked", !currentState);
    });

    // 2. INFECÇÃO
    html.find('.stage-dot').click(async (ev) => {
      ev.preventDefault();
      const val = ev.currentTarget.dataset.value;
      await this.actor.update({ "system.details.infection": val });
    });

    // 3. CONDIÇÕES (Blindado)
    html.find('.condition-btn').click(async (ev) => {
      ev.preventDefault();
      const prop = ev.currentTarget.dataset.prop;
      const conditions = this.actor.system.conditions || {};
      const currentVal = conditions[prop] || false;
      await this.actor.update({ [`system.conditions.${prop}`]: !currentVal });
    });

    // 4. ESTRESSE (Clique direto na bolinha)
    html.find('.stress-box').click(async (ev) => {
      const idx = Number(ev.currentTarget.dataset.index); // Qual bolinha clicou (1 a 6)
      const current = this.actor.system.resources.estresse.value;

      // Se clicou na que já está ativa, desce 1. Se não, vai para o valor clicado.
      const novoValor = idx === current ? idx - 1 : idx;

      await this.actor.update({ "system.resources.estresse.value": novoValor });
    });
    // 5. MUDANÇA DE ARQUÉTIPO
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

    // 6. ROLAGEM
    html.find('.rollable').click(this._onRoll.bind(this));

    // 7. RECUPERAR ESTRESSE (Botão de Ajuda)
    html.find('.recover-stress-btn').click(async (ev) => {
      ev.preventDefault();
      const estresseAtual = this.actor.system.resources.estresse.value;

      // Pega nome do alvo
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

    // 8. CONTROLES RÁPIDOS (+ e -)
    // Vida e Resistência
    html.find('.stat-control').click(async (ev) => {
      ev.preventDefault();
      const btn = ev.currentTarget;
      const target = btn.dataset.target; // pv ou pr
      const isPlus = btn.classList.contains('plus');

      const resource = this.actor.system.resources[target];
      const current = Number(resource.value);
      const max = Number(resource.max);

      let novoValor = isPlus ? current + 1 : current - 1;

      // CORREÇÃO: Math.clamp em vez de Math.clamped
      novoValor = Math.clamp(novoValor, 0, max);

      await this.actor.update({ [`system.resources.${target}.value`]: novoValor });
    });

    // Estresse
    html.find('.stress-control').click(async (ev) => {
      ev.preventDefault();
      const btn = ev.currentTarget;
      const isPlus = btn.classList.contains('plus');
      const current = Number(this.actor.system.resources.estresse.value);

      let novoValor = isPlus ? current + 1 : current - 1;

      // CORREÇÃO: Math.clamp em vez de Math.clamped
      novoValor = Math.clamp(novoValor, 0, 6);

      await this.actor.update({ "system.resources.estresse.value": novoValor });
    });

    // 9. LIMPAR VÍNCULO (Drag & Drop UI)
    html.find('.clear-link').click(async (ev) => {
      ev.preventDefault();
      const target = ev.currentTarget.dataset.target;
      await this.actor.update({ [`system.details.${target}_target`]: "" });
    });

    // --- GESTÃO DE ITENS ---
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

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

    if (this.actor.isOwner) {
      html.find('.item-create').click(this._onItemCreate.bind(this));
    }

    // DRAG START
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  // --- MÉTODOS AUXILIARES ---

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

  async _processRoll(dataset) {
    let diceCount = 1;
    let label = dataset.label || "Rolagem";

    if (dataset.rollType === 'skill') {
      const skillVal = this.actor.system.skills[dataset.key].value;
      diceCount = skillVal + 1;
    } else if (dataset.key) {
      diceCount = this.actor.system.attributes[dataset.key]?.value || 1;
    }

    let roll = new Roll(`${diceCount}d6`);
    await roll.evaluate();

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
            <div class="extincao-roll">
                <h3>${label}</h3>
                <div class="roll-result ${roll.total >= 6 ? 'success' : 'failure'}">${roll.total}</div>
                <div class="dice-tray">${roll.result}</div>
            </div>`
    });
  }
}