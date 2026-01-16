import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { EXTINCAO } from "../helpers/config.mjs"; // <--- A LINHA QUE FALTAVA

export class BoilerplateActorSheet extends ActorSheet {

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            // ADICIONE "extincao-sheet" NESTA LISTA:
            classes: ["extincao", "sheet", "actor", "extincao-sheet"],
            template: "systems/extincao/templates/actor/actor-sheet.hbs",
            width: 600,
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

        // --- MAPA DE PERÍCIAS REVISADO ---
        const SKILL_MAP = {
            // FORÇA (Físico Bruto)
            "briga": "for",
            "armas_brancas": "for",
            "atletismo": "for",

            // DESTREZA (Agilidade/Coordenação)
            "armas_fogo": "des",
            "furtividade": "des",
            "pilotagem": "des",
            "ladinagem": "des",
            "esquiva": "des",

            // CONSTITUIÇÃO (Resistência)
            "vigor": "con",

            // INTELIGÊNCIA (Conhecimento/Técnica)
            "medicina": "int",
            "tecnologia": "int",
            "investigacao": "int",
            "sobrevivencia": "int",
            "ciencias": "int",

            // PERCEPÇÃO (Sentidos/Alerta)
            "percepcao": "per",
            "atencao": "per", // <--- MUDADO PARA PERCEPÇÃO
            "intuicao": "per",

            // VONTADE (Social/Mental)
            "lideranca": "von",
            "adestramento": "von",
            "intimidacao": "von",
            "diplomacia": "von"
        };

        if (context.system.skills) {
            for (const [key, skill] of Object.entries(context.system.skills)) {
                // Se a perícia não estiver na lista, joga para INT por padrão
                skill.attribute = SKILL_MAP[key] || "int";
            }
        }

        if (actorData.type == 'character') {
            this._prepareItems(context);
            this._prepareCharacterData(context);
        }

        if (actorData.type == 'npc') {
            this._prepareItems(context);
        }

        context.rollData = context.actor.getRollData();
        context.effects = prepareActiveEffectCategories(this.actor.effects);
        context.arquetipos = EXTINCAO.ARQUETIPOS;

        const editorClass = foundry.applications?.ux?.TextEditor ?? TextEditor;
        context.enrichedBiography = await editorClass.enrichHTML(this.actor.system.details?.biography || "", { async: true, relativeTo: this.actor });

        return context;
    }
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

        // 3. CONDIÇÕES
        // 3. CONDIÇÕES (Com proteção contra erro de undefined)
        html.find('.condition-btn').click(async (ev) => {
            ev.preventDefault();
            const prop = ev.currentTarget.dataset.prop; // ex: "fome"

            // Proteção: Se 'conditions' não existir na ficha, cria um objeto vazio
            const conditions = this.actor.system.conditions || {};

            // Pega o valor atual (se não existir, assume false)
            const currentVal = conditions[prop] || false;

            // Atualiza invertendo o valor (!currentVal)
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

        // Itens
        if (this.isEditable) {
            html.find('.item-create').click(this._onItemCreate.bind(this));
            html.find('.item-edit').click(ev => {
                const li = $(ev.currentTarget).parents(".item");
                this.actor.items.get(li.data("itemId")).sheet.render(true);
            });
            html.find('.item-delete').click(ev => {
                const li = $(ev.currentTarget).parents(".item");
                this.actor.items.get(li.data("itemId")).delete();
            });
        }
    }

    async _onItemCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        const type = header.dataset.type;
        const itemData = { name: `Novo ${type}`, type: type };
        return await Item.create(itemData, { parent: this.actor });
    }

    async _onRoll(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;
        this._processRoll(dataset);
    }

    async _processRoll(dataset) {
        // Lógica simplificada para garantir funcionamento básico
        // Se quiser a complexa (ruído/febre), cole aquela versão maior aqui depois
        let diceCount = 0;
        let label = dataset.label || "Rolagem";

        if (dataset.rollType === 'skill') {
            const skillVal = this.actor.system.skills[dataset.key].value;
            const attrKey = dataset.key === "atletismo" ? "for" : "int"; // Simplificação
            const attrVal = this.actor.system.attributes[attrKey]?.value || 1;
            diceCount = attrVal + skillVal;
        } else if (dataset.key) {
            diceCount = this.actor.system.attributes[dataset.key].value;
        }

        if (diceCount < 1) diceCount = 1;

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

    _prepareItems(context) {
        const gear = [];
        const features = [];
        for (let i of context.items) {
            i.img = i.img || DEFAULT_TOKEN;
            if (i.type === 'item' || i.type === 'arma') gear.push(i);
            else if (i.type === 'feature' || i.type === 'qualidade') features.push(i);
        }
        context.gear = gear;
        context.features = features;
    }

    _prepareCharacterData(context) { }
}