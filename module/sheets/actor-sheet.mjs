import { onManageActiveEffect, prepareActiveEffectCategories } from '../helpers/effects.mjs';

const ActorSheet = foundry.appv1.sheets.ActorSheet;

// =============================================================================
// 1. CONSTANTES E CONFIGURAÇÕES
// =============================================================================

const UD_CHAIN = { "d12": "d10", "d10": "d8", "d8": "d6", "d6": "d4", "d4": "0" };

const DENSIDADE_OPTIONS = {
    "bando": "BANDO (5-10) - Bloqueia Corredores",
    "multidao": "MULTIDÃO (11-30) - Ocupa Ruas",
    "mare": "MARÉ (30+) - Força da Natureza"
};

const SKILL_MAP = {
    "armas_fogo": "des", "armas_brancas": "for", "briga": "for", "esquiva": "des",
    "atletismo": "con", "furtividade": "des", "atencao": "per", "sobrevivencia": "int",
    "pilotagem": "des", "primeiros_socorros": "int", "medicina": "int", "mecanica": "int",
    "eletronica": "int", "social": "von"
};

const ARQUETIPOS_LISTA = [
    "O Combatente", "O Civil (Força Bruta)", "A Médica", "O Técnico",
    "O Líder Espiritual", "O Marginal", "A Atleta", "O Sniper", "O Mascote",
    "Outro / Customizado"
];

const ARCHETYPE_STATS = {
    "O Combatente": { attributes: { for: 3, des: 3, con: 3, int: 2, per: 2, von: 2 } },
    "O Civil (Força Bruta)": { attributes: { for: 4, des: 2, con: 4, int: 2, per: 1, von: 2 } },
    "A Médica": { attributes: { for: 1, des: 2, con: 2, int: 5, per: 3, von: 2 } },
    "O Técnico": { attributes: { for: 1, des: 3, con: 2, int: 5, per: 2, von: 2 } },
    "O Líder Espiritual": { attributes: { for: 2, des: 2, con: 2, int: 3, per: 2, von: 4 } },
    "O Marginal": { attributes: { for: 2, des: 4, con: 2, int: 2, per: 3, von: 2 } },
    "A Atleta": { attributes: { for: 3, des: 4, con: 4, int: 1, per: 2, von: 1 } },
    "O Sniper": { attributes: { for: 2, des: 4, con: 2, int: 2, per: 4, von: 1 } },
    "O Mascote": { attributes: { for: 1, des: 4, con: 2, int: 2, per: 3, von: 3 } }
};
const SAUDE_HABITANTE = {
    "saudavel": "Saudável (Ativo)",
    "ferido": "Ferido (Requer Cuidados)",
    "doente": "Doente / Infectado",
    "incapacitado": "Incapacitado",
    "morto": "Morto"
};
// =============================================================================
// 2. CLASSE DA FICHA DE ATOR
// =============================================================================

export class BoilerplateActorSheet extends ActorSheet {

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['boilerplate', 'sheet', 'actor', 'extincao-sheet'],
            width: 900,
            height: 750,
            tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'main' }],
        });
    }

    constructor(object, options = {}) {
        if (object.type === 'npc') { options.width = 600; options.height = 600; }
        else if (object.type === 'horda') { options.width = 700; options.height = 650; }
        else if (object.type === 'refugio') { options.width = 700; options.height = 750; }
        super(object, options);
    }

    get template() { return `systems/extincao/templates/actor/actor-${this.actor.type}-sheet.hbs`; }

    async getData() {
        const context = super.getData();
        const actorData = this.document.toObject(false);
        context.system = actorData.system;
        context.flags = actorData.flags;
        context.isLocked = this.actor.getFlag("extincao", "sheetLocked") || false;
        context.arquetipos = ARQUETIPOS_LISTA.reduce((acc, arq) => { acc[arq] = arq; return acc; }, {});
        context.densidadeOptions = DENSIDADE_OPTIONS;

        if (this.actor.type === 'npc') {
            const tipoNPC = actorData.system.details?.tipo;
            context.showSkills = (tipoNPC === 'humano' || tipoNPC === 'animal');
        }

        this._prepareItems(context);

        if (actorData.type == 'sobrevivente') {
            this._calculateSpentPoints(context);
        }

        const editorClass = foundry.applications?.ux?.TextEditor ?? TextEditor;
        context.enrichedBiography = await editorClass.enrichHTML(this.actor.system.details?.biography || "", { async: true, relativeTo: this.actor });
        context.enrichedNotes = await editorClass.enrichHTML(this.actor.system.details?.notes || "", { async: true, relativeTo: this.actor });

        if (this.actor.type === 'refugio') {
            context.enrichedProjetos = await editorClass.enrichHTML(this.actor.system.details?.projetos || "", { async: true, relativeTo: this.actor });
        }

        context.effects = prepareActiveEffectCategories(this.actor.allApplicableEffects());

        return context;
    }

    _prepareItems(context) {
        const armas = [], equipamentos = [], qualidades = [], defeitos = [], traumas = [], habitantes = [];

        for (let i of context.items) {
            i.img = i.img || Item.DEFAULT_ICON;
            if (i.type === 'arma') armas.push(i);
            else if (i.type === 'qualidade') qualidades.push(i);
            else if (i.type === 'defeito') defeitos.push(i);
            else if (i.type === 'trauma') traumas.push(i);
            else if (i.type === 'habitante') habitantes.push(i);
            else equipamentos.push(i);
        }

        context.armas = armas;
        context.equipamentos = equipamentos;
        context.qualidades = qualidades;
        context.defeitos = defeitos;
        context.traumas = traumas;
        context.habitantes = habitantes;
    }

    _calculateSpentPoints(context) {
        let attrTotal = 0; for (const k in context.system.attributes) attrTotal += Number(context.system.attributes[k].value) || 0;
        let skillTotal = 0; for (const k in context.system.skills) skillTotal += Number(context.system.skills[k].value) || 0;
        context.points = { attributes: attrTotal, skills: skillTotal };
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.resource-control').click(this._onResourceControl.bind(this));

        html.find('.alert-segment').click(async (ev) => {
            const idx = Number(ev.currentTarget.dataset.index);
            const current = Number(this.actor.system.resources.alerta.value) || 0;
            let newValue = idx === current ? idx - 1 : idx;
            await this.actor.update({ "system.resources.alerta.value": newValue });
        });

        html.find('.header-archetype select').change(async (ev) => {
            const stats = ARCHETYPE_STATS[ev.target.value];
            if (!stats) return;
            if (await Dialog.confirm({ title: "Aplicar Arquétipo?", content: "Isso vai redefinir seus Atributos para o padrão do arquétipo." })) {
                let u = {}; for (const k in stats.attributes) u[`system.attributes.${k}.value`] = stats.attributes[k];
                await this.actor.update(u);
            }
        });

        html.find('.lock-btn').click(async () => await this.actor.setFlag("extincao", "sheetLocked", !this.actor.getFlag("extincao", "sheetLocked")));

        html.find('.rollable').click(this._onRoll.bind(this));

        html.find('.stress-box').click(async (ev) => {
            const idx = Number(ev.currentTarget.dataset.index);
            const current = this.actor.system.resources.estresse.value;
            await this.actor.update({ "system.resources.estresse.value": idx === current ? idx - 1 : idx });
        });

        html.find('.item-edit').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            this.actor.items.get(li.data("itemId")).sheet.render(true);
        });
        if (!this.isEditable) return;

        html.find('.item-create').click(ev => Item.create({ name: `Novo ${ev.currentTarget.dataset.type}`, type: ev.currentTarget.dataset.type }, { parent: this.actor }));

        html.find('.item-delete').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            this.actor.items.get(li.data("itemId")).delete();
        });

        html.find('.effect-control').click(ev => onManageActiveEffect(ev, this.actor));
        html.find('.habitante-control').click(this._onManageHabitante.bind(this));
        // 1. Criar Novo Habitante
        html.find('.habitante-create').click(async (ev) => {
            const habitantes = this.actor.system.habitantes || [];
            // Adiciona um habitante padrão ao array
            habitantes.push({
                nome: "Novo Sobrevivente",
                funcao: "Desempregado",
                saude: "saudavel",
                notas: ""
            });
            await this.actor.update({ "system.habitantes": habitantes });
        });

        // 2. Deletar Habitante (Botão da Lixeira na lista)
        html.find('.habitante-delete').click(async (ev) => {
            ev.stopPropagation(); // Impede que abra o modal ao clicar na lixeira
            const idx = Number(ev.currentTarget.dataset.index);
            const habitantes = this.actor.system.habitantes || [];

            const confirm = await Dialog.confirm({ title: "Expulsar Habitante?", content: "Essa ação é irreversível." });
            if (confirm) {
                habitantes.splice(idx, 1);
                await this.actor.update({ "system.habitantes": habitantes });
            }
        });
    }
    async _onManageHabitante(event) {
        event.preventDefault();

        // 1. Identificar o Habitante e o Estado da Ficha
        const index = event.currentTarget.dataset.index; // O índice no array
        const habitantes = this.actor.system.habitantes || []; // O array de dados
        const habitante = habitantes[index];

        // VERIFICAÇÃO DE SEGURANÇA: A Ficha está travada?
        const isLocked = this.actor.getFlag("extincao", "sheetLocked");
        const disabledAttr = isLocked ? "disabled" : ""; // String mágica para o HTML

        if (!habitante) return;

        // 2. Construir o HTML do Modal (Formulário)
        // Note que injetamos a variável ${disabledAttr} em cada input/select

        // Gerar as opções do Dropdown de Saúde dinamicamente
        let optionsHtml = "";
        for (const [key, label] of Object.entries(SAUDE_HABITANTE)) {
            const selected = (habitante.saude === key) ? "selected" : "";
            optionsHtml += `<option value="${key}" ${selected}>${label}</option>`;
        }

        const content = `
        <form class="habitante-modal">
            <div class="form-group">
                <label>Nome do Habitante:</label>
                <input type="text" name="nome" value="${habitante.nome}" ${disabledAttr}/>
            </div>
            
            <div class="form-group">
                <label>Função / Papel:</label>
                <input type="text" name="funcao" value="${habitante.funcao}" ${disabledAttr}/>
            </div>

            <div class="form-group">
                <label>Estado de Saúde:</label>
                <select name="saude" ${disabledAttr}>
                    ${optionsHtml}
                </select>
            </div>
            
            <div class="form-group">
                <label>Notas:</label>
                <textarea name="notas" ${disabledAttr}>${habitante.notas || ""}</textarea>
            </div>
            
            ${isLocked ? `<p style="color:darkred; font-style:italic; margin-top:10px;"><i class="fas fa-lock"></i> Ficha Travada: Modo Leitura</p>` : ''}
        </form>
        `;

        // 3. Criar os Botões do Dialog
        // Se estiver travado, mostramos apenas "Fechar". Se não, "Salvar" e "Excluir".
        let buttons = {};

        if (isLocked) {
            buttons = {
                close: { label: "Fechar", icon: "<i class='fas fa-times'></i>" }
            };
        } else {
            buttons = {
                save: {
                    label: "Salvar",
                    icon: "<i class='fas fa-save'></i>",
                    callback: async (html) => {
                        // Captura os dados do formulário
                        const nome = html.find('input[name="nome"]').val();
                        const funcao = html.find('input[name="funcao"]').val();
                        const saude = html.find('select[name="saude"]').val();
                        const notas = html.find('textarea[name="notas"]').val();

                        // Atualiza o array localmente
                        habitantes[index] = { ...habitante, nome, funcao, saude, notas };

                        // Envia para o servidor
                        await this.actor.update({ "system.habitantes": habitantes });
                    }
                },
                delete: {
                    label: "Excluir",
                    icon: "<i class='fas fa-trash'></i>",
                    callback: async () => {
                        const confirm = await Dialog.confirm({ title: "Excluir Habitante?", content: "Tem certeza?" });
                        if (confirm) {
                            habitantes.splice(index, 1);
                            await this.actor.update({ "system.habitantes": habitantes });
                        }
                    }
                }
            };
        }

        // 4. Renderizar o Dialog
        new Dialog({
            title: `Detalhes: ${habitante.nome}`,
            content: content,
            buttons: buttons,
            default: isLocked ? "close" : "save"
        }).render(true);
    }

    /** @override */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);

        // LÓGICA: Arrastar um Ator (NPC/Player) para dentro do Refúgio
        if (this.actor.type === 'refugio' && data.type === 'Actor') {
            const sourceActor = await fromUuid(data.uuid);

            if (sourceActor) {
                // Define a "Função" baseado no tipo de ator original
                let funcao = "Civil";
                if (sourceActor.type === "sobrevivente") {
                    funcao = sourceActor.system.details?.archetype || "Sobrevivente";
                } else if (sourceActor.type === "npc") {
                    funcao = "NPC / Aliado";
                }

                // PEGA A BIO ORIGINAL
                const bioOriginal = sourceActor.system.details?.biography || "";

                // Cria o objeto do novo item
                const itemData = {
                    name: sourceActor.name,
                    type: "habitante", // Transforma em Item
                    img: sourceActor.img,
                    system: {
                        funcao: funcao,
                        estado: "Saudável",
                        quantity: 1,
                        description: bioOriginal // <--- AQUI COPIA A BIO
                    }
                };

                // Cria o item dentro do Refúgio
                return await this.actor.createEmbeddedDocuments("Item", [itemData]);
            }
        }

        // Se não for um ator caindo em refúgio, segue o comportamento padrão
        return super._onDrop(event);
    }

    async _onResourceControl(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const action = button.dataset.action;
        const target = button.dataset.target;

        let path = `system.resources.${target}.value`;
        let resource = this.actor.system.resources?.[target];

        if (!resource) {
            path = `system.attributes.${target}.value`;
            resource = this.actor.system.attributes?.[target];
        }

        if (!resource) {
            console.warn(`[EXTINÇÃO] Recurso '${target}' não encontrado.`);
            return;
        }

        let value = Number(resource.value) || 0;
        const max = (resource.max !== undefined) ? Number(resource.max) : 99;

        if (action === "plus" && value < max) {
            value++;
        }
        else if (action === "minus" && value > 0) {
            value--;
        }

        await this.actor.update({ [path]: value });
    }

    async _onRoll(event) {
        event.preventDefault();
        const dataset = event.currentTarget.dataset;

        if (['horda-abraco', 'horda-fuga', 'usage', 'item'].includes(dataset.rollType)) {
            return this._processRoll(dataset);
        }

        if (dataset.rollType === 'instinct') {
            return this._processRoll({ ...dataset, key: 'instinto', label: 'INSTINTO PURO' });
        }

        let label = dataset.label;
        if (dataset.rollType === 'skill') label = `${dataset.label} (Perícia)`;
        if (dataset.key && !dataset.rollType) label = `${dataset.key.toUpperCase()} (Atributo)`;

        new Dialog({
            title: `Rolar: ${label}`,
            content: `
                <form>
                    <div class="form-group">
                        <label>Modificador de Dados (+/-)</label>
                        <input type="number" name="modifier" value="0" autofocus/>
                    </div>
                    <p style="font-size:0.8em;color:#888;">Ex: -3 (Escuridão), +2 (Vantagem)</p>
                </form>
            `,
            buttons: {
                roll: {
                    label: "ROLAR",
                    icon: '<i class="fas fa-dice-d6"></i>',
                    callback: (html) => this._processRoll(dataset, Number(html.find('[name="modifier"]').val()) || 0)
                }
            },
            default: "roll"
        }).render(true);
    }

    async _processRoll(dataset, modifier = 0) {

        if (dataset.rollType === 'usage') {
            const item = this.actor.items.get(dataset.itemId);
            const currentUd = item.system.uso;

            if (!currentUd || currentUd === "0") return;

            let roll = new Roll(`1${currentUd}`);
            await roll.evaluate();
            const result = roll.total;

            let degraded = result <= 2;

            if (degraded) {
                await item.update({ "system.uso": UD_CHAIN[currentUd] || "0" });
            }

            let message = `
                <div class="extincao-roll">
                    <h3 class="roll-label">Munição: ${item.name}</h3>
                    <div class="roll-result ${degraded ? 'failure' : 'success'}">${result}</div>
                    <div class="roll-details">Dado: 1${currentUd}</div>
                    ${degraded ? `<div style="color:#ff4444;font-weight:bold;">⚠️ GASTO! Caiu para: ${UD_CHAIN[currentUd] || "VAZIO"}</div>` : `<div style="color:#4eff8c;">Preservado.</div>`}
                </div>`;

            roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: message });
            return;
        }

        let diceCount = 0;
        let label = dataset.label;
        let poolFormula = "";
        let isInstinctRoll = false;
        let successThreshold = 6;

        if (dataset.rollType === 'skill') {
            const skillKey = dataset.key;
            const attrKey = SKILL_MAP[skillKey] || "int";
            const skillVal = this.actor.system.skills[skillKey].value;
            const attrVal = this.actor.system.attributes[attrKey].value;

            diceCount = attrVal + skillVal;
            label = `${dataset.label}`;
            poolFormula = `${attrVal} (Attr) + ${skillVal} (Skill)`;

            if (skillVal >= 4) {
                successThreshold = 5;
                poolFormula += " [MAESTRIA]";
            }
        }
        else if (dataset.key === 'instinto') {
            diceCount = 1;
            isInstinctRoll = true;
            poolFormula = "1d6 (Puro)";
        }
        else if (dataset.key) {
            diceCount = this.actor.system.attributes[dataset.key].value;
            poolFormula = `${diceCount} (Atributo)`;
        }

        if (modifier !== 0) {
            diceCount += modifier;
            poolFormula += ` ${modifier >= 0 ? '+' : ''}${modifier} (Mod)`;
        }

        if (diceCount < 1) {
            diceCount = 1;
            isInstinctRoll = true;
            poolFormula += " -> INSTINTO";
        }

        let roll = new Roll(`${diceCount}d6`);
        await roll.evaluate();
        const results = roll.terms[0].results.map(d => d.result);

        let successes = results.filter(r => r >= successThreshold).length;
        let sixes = results.filter(r => r === 6).length;
        let ones = results.filter(r => r === 1).length;

        let isGlitch = false;
        if (isInstinctRoll && results[0] <= 3) isGlitch = true;
        else if (!isInstinctRoll && successes === 0 && ones > 0) isGlitch = true;

        let statusClass = successes > 0 ? 'success' : 'failure';
        let statusText = successes > 0 ? `${successes} SUCESSO(S)` : 'FALHA';

        if (isGlitch) {
            statusText = "GLITCH / CATÁSTROFE";
            statusClass = "glitch";
        }

        let content = `
        <div class="extincao-roll">
            <h3 class="roll-label">${label}</h3>
            <div class="roll-result ${statusClass}">${statusText}</div>
            ${isInstinctRoll ? '<div style="color:orange;font-size:0.8em;text-align:center;">⚠️ Dado de Instinto</div>' : ''}
            <div class="roll-details">${diceCount}d6 [${results.join(', ')}]<br><span style="color:#666;">Pool: ${poolFormula}</span></div>
            ${sixes > 0 ? `<div style="margin-top:5px;border-top:1px solid #333;color:#8b0000;"><strong>CRÍTICOS: ${sixes}</strong></div>` : ''}
        </div>`;

        roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: label, content: content });
    }
}