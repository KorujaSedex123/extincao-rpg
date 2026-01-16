import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { EXTINCAO } from "../helpers/config.mjs";

export class BoilerplateActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["extincao", "sheet", "actor", "extincao-sheet"], // Classe CSS corrigida
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

    // Prepara itens (Inventário) para personagens
    if (actorData.type == 'sobrevivente' || actorData.type == 'character') {
      this._prepareItems(context);
    }

    context.rollData = context.actor.getRollData();
    context.effects = prepareActiveEffectCategories(this.actor.effects);
    context.arquetipos = EXTINCAO.ARQUETIPOS; 

    const editorClass = foundry.applications?.ux?.TextEditor ?? TextEditor;
    context.enrichedBiography = await editorClass.enrichHTML(this.actor.system.details?.biography || "", { async: true, relativeTo: this.actor });

    return context;
  }

  /**
   * Organiza os itens em categorias para o HTML
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

    // 3. CONDIÇÕES (Blindado contra erros)
    html.find('.condition-btn').click(async (ev) => {
        ev.preventDefault();
        const prop = ev.currentTarget.dataset.prop;
        const conditions = this.actor.system.conditions || {};
        const currentVal = conditions[prop] || false;
        await this.actor.update({ [`system.conditions.${prop}`]: !currentVal });
    });

    // 4. ESTRESSE
    html.find('.stress-box').click(async (ev) => {
        const idx = Number(ev.currentTarget.dataset.index);
        const current = this.actor.system.resources.estresse.value;
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

    // --- GESTÃO DE ITENS (CRUD) ---
    // Edição e Exclusão (Sempre ativos)
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
            no: () => {},
            defaultYes: false
        });
    });

    // CRIAÇÃO DE ITEM (Aqui estava o problema)
    // Agora garantimos que funciona mesmo travado ou destravado, se o usuário tiver permissão
    if (this.actor.isOwner) {
        html.find('.item-create').click(this._onItemCreate.bind(this));
    }
    
    // ARRASTAR E SOLTAR (Drag & Drop)
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

  /**
   * Cria um novo item ao clicar no botão "+"
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Pega o tipo do botão (arma, equipamento, item)
    const type = header.dataset.type;
    
    console.log(`Tentando criar item do tipo: ${type}`); // Log para Debug no F12

    // Prepara o objeto
    const itemData = {
      name: `Novo ${type.charAt(0).toUpperCase() + type.slice(1)}`, // Ex: Nova Arma
      type: type,
      system: {}
    };

    // Cria no banco de dados
    return await Item.create(itemData, {parent: this.actor});
  }

  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    
    // Lógica simples de rolagem
    if(dataset.rollType == "item") {
        const item = this.actor.items.get(element.closest("li").dataset.itemId);
        if(item) return item.roll();
    }
    
    // Rolagem de Atributo/Perícia
    this._processRoll(dataset); 
  }

  async _processRoll(dataset) {
        let diceCount = 1;
        let label = dataset.label || "Rolagem";
        
        if (dataset.rollType === 'skill') {
            const skillVal = this.actor.system.skills[dataset.key].value;
            // Busca o atributo pai dinamicamente pelo SKILL_MAP se possível, ou usa lógica simples
            // Como simplificação aqui, usaremos o valor do atributo na própria skill se você gravou,
            // ou faremos uma busca manual rápida
            // (Você pode aprimorar isso depois com o mapa completo aqui também)
            diceCount = skillVal + 1; // Simplificado: Perícia + 1 Base
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