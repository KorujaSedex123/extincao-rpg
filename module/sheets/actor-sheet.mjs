import { onManageActiveEffect, prepareActiveEffectCategories } from '../helpers/effects.mjs';

// --- CORREÇÃO V12: Definir o caminho da classe ActorSheet ---
// Isso elimina os avisos amarelos de "accessing global ActorSheet"
const ActorSheet = foundry.appv1.sheets.ActorSheet;

// =============================================================================
// 1. CONSTANTES E CONFIGURAÇÕES
// =============================================================================

// Cadeia de Degradação do Dado de Uso (Munição)
const UD_CHAIN = {
    "d12": "d10",
    "d10": "d8",
    "d8": "d6",
    "d6": "d4",
    "d4": "0" // 0 significa vazio
};

// Opções de Densidade para a Horda
const DENSIDADE_OPTIONS = {
    "bando": "BANDO (5-10) - Bloqueia Corredores",
    "multidao": "MULTIDÃO (11-30) - Ocupa Ruas",
    "mare": "MARÉ (30+) - Força da Natureza"
};

// Banco de Dados de Arquétipos (Apenas Atributos)
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

// Mapa de Perícia -> Atributo Base
const SKILL_MAP = {
    "armas_fogo": "des", "armas_brancas": "for", "briga": "for", "esquiva": "des",
    "atletismo": "con", "furtividade": "des", "atencao": "per", "sobrevivencia": "int",
    "pilotagem": "des", "primeiros_socorros": "int", "medicina": "int", "mecanica": "int",
    "eletronica": "int", "social": "von"
};

// Gera lista de opções para o dropdown
const ARQUETIPOS_LISTA = Object.keys(ARCHETYPE_STATS);
ARQUETIPOS_LISTA.push("Outro / Customizado");

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

    /**
     * CONSTRUTOR: Define o tamanho da janela ANTES de renderizar
     */
    constructor(object, options = {}) {
        // Se for NPC, força tamanho menor
        if (object.type === 'npc') {
            options.width = options.width || 600;
            options.height = options.height || 600;
        }
        // Se for Horda, tamanho médio
        else if (object.type === 'horda') {
            options.width = options.width || 700;
            options.height = options.height || 650;
        }
        // Se for Base, tamanho customizado
        else if (object.type === 'refugio') {
            options.width = options.width || 600;
            options.height = options.height || 700;
        }

        // Inicia a ficha com as opções ajustadas
        super(object, options);
    }

    /** @override - Seleciona o HTML correto baseado no tipo */
    get template() {
        return `systems/extincao/templates/actor/actor-${this.actor.type}-sheet.hbs`;
    }

    /** @override - Prepara os dados para o HTML */
    async getData() {
        const context = super.getData();
        const actorData = this.document.toObject(false);
        context.system = actorData.system;
        context.flags = actorData.flags;
        context.config = CONFIG.BOILERPLATE;

        // Flag de travamento (Funciona para Sobrevivente e NPC agora)
        context.isLocked = this.actor.getFlag("extincao", "sheetLocked") || false;

        // Listas para Dropdowns
        context.arquetipos = ARQUETIPOS_LISTA.reduce((acc, arq) => { acc[arq] = arq; return acc; }, {});
        context.densidadeOptions = DENSIDADE_OPTIONS; // Horda

        // Lógica para NPCs:
        // 1. Atributos aparecem para todos.
        // 2. Perícias só aparecem se for Humano ou Animal.
        if (this.actor.type === 'npc') {
            const tipoNPC = actorData.system.details?.tipo;
            context.showSkills = (tipoNPC === 'humano' || tipoNPC === 'animal');
        }

        // Itens e Pontos (Só para Sobrevivente)
        if (actorData.type == 'sobrevivente') {
            this._prepareItems(context);
            this._calculateSpentPoints(context);
        }

        // Text Editor (V12 Compatible)
        const editorClass = foundry.applications?.ux?.TextEditor ?? TextEditor;
        context.enrichedQualidades = await editorClass.enrichHTML(this.actor.system.details?.qualidades || "", { async: true, relativeTo: this.actor });
        context.enrichedDefeitos = await editorClass.enrichHTML(this.actor.system.details?.defeitos || "", { async: true, relativeTo: this.actor });
        context.enrichedTraumas = await editorClass.enrichHTML(this.actor.system.details?.traumas || "", { async: true, relativeTo: this.actor });
        context.enrichedBiography = await editorClass.enrichHTML(this.actor.system.details?.biography || "", { async: true, relativeTo: this.actor });
        context.enrichedNotes = await editorClass.enrichHTML(this.actor.system.details?.notes || "", { async: true, relativeTo: this.actor });

        context.effects = prepareActiveEffectCategories(this.actor.allApplicableEffects());

        return context;
    }

    /** Separa os itens em categorias */
    _prepareItems(context) {
        const armas = [];
        const equipamentos = [];
        const qualidades = [];
        const defeitos = [];
        const traumas = [];

        for (let i of context.items) {
            i.img = i.img || Item.DEFAULT_ICON;

            if (i.type === 'arma') { armas.push(i); }
            else if (i.type === 'qualidade') { qualidades.push(i); }
            else if (i.type === 'defeito') { defeitos.push(i); }
            else if (i.type === 'trauma') { traumas.push(i); }
            else { equipamentos.push(i); }
        }

        context.armas = armas;
        context.equipamentos = equipamentos;
        context.qualidades = qualidades;
        context.defeitos = defeitos;
        context.traumas = traumas;
    }

    /** Conta pontos gastos na criação */
    _calculateSpentPoints(context) {
        let attrTotal = 0;
        for (const [key, attr] of Object.entries(context.system.attributes)) {
            attrTotal += Number(attr.value) || 0;
        }
        let skillTotal = 0;
        for (const [key, skill] of Object.entries(context.system.skills)) {
            skillTotal += Number(skill.value) || 0;
        }
        context.points = { attributes: attrTotal, skills: skillTotal };
    }

    /** @override - Ativa os ouvintes de clique */
    activateListeners(html) {
        super.activateListeners(html);

        // 1. MEDIDOR DE ALERTA (HORDA)
        html.find('.alert-segment').click(async (ev) => {
            ev.preventDefault();
            const idx = Number(ev.currentTarget.dataset.index);
            const current = Number(this.actor.system.resources.alerta.value) || 0;
            let newValue = idx;
            if (current === idx) newValue = idx - 1;
            await this.actor.update({ "system.resources.alerta.value": newValue });
        });

        // 2. MUDANÇA DE ARQUÉTIPO
        html.find('.header-archetype select').change(this._onArchetypeChange.bind(this));

        // 3. EDITAR ITEM
        html.find('.item-edit').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.actor.items.get(li.data("itemId"));
            item.sheet.render(true);
        });

        // 4. TRAVAR FICHA
        html.find('.lock-btn').click(async (ev) => {
            ev.preventDefault();
            const currentLock = this.actor.getFlag("extincao", "sheetLocked");
            await this.actor.setFlag("extincao", "sheetLocked", !currentLock);
        });

        // 5. ROLAGEM GERAL
        html.find('.rollable').click(this._onRoll.bind(this));

        // 6. ESTRESSE
        html.find('.stress-box').click(async (ev) => {
            ev.preventDefault();
            const idx = Number(ev.currentTarget.dataset.index);
            const current = this.actor.system.resources.estresse.value;
            let newValue = idx;
            if (current === idx) newValue = idx - 1;
            await this.actor.update({ "system.resources.estresse.value": newValue });
        });

        if (!this.isEditable) return;

        // 7. CRIAR E DELETAR ITEM
        html.find('.item-create').click(this._onItemCreate.bind(this));
        html.find('.item-delete').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.actor.items.get(li.data("itemId"));
            item.delete();
            li.slideUp(200, () => this.render(false));
        });

        // 8. EFEITOS
        html.find('.effect-control').click(ev => {
            const row = ev.currentTarget.closest('li');
            const document = row.dataset.parentId === this.actor.id ? this.actor : this.actor.items.get(row.dataset.parentId);
            onManageActiveEffect(ev, document);
        });
    }

    /** APLICA ARQUÉTIPO (AUTOMATIZAÇÃO) */
    async _onArchetypeChange(event) {
        event.preventDefault();
        const selectedArchetype = event.target.value;
        const stats = ARCHETYPE_STATS[selectedArchetype];

        if (!stats) return;

        const confirm = await Dialog.confirm({
            title: "Aplicar Arquétipo?",
            content: `<p>Ao selecionar <strong>${selectedArchetype}</strong>, seus <strong>Atributos</strong> serão redefinidos.</p><p>As perícias NÃO serão alteradas.</p><p>Deseja continuar?</p>`,
            defaultYes: false
        });

        if (!confirm) return this.render(false);

        let updateData = {};
        for (const [key, value] of Object.entries(stats.attributes)) {
            updateData[`system.attributes.${key}.value`] = value;
        }
        await this.actor.update(updateData);
        ui.notifications.info(`Atributos de ${selectedArchetype} aplicados.`);
    }

    /** CRIAÇÃO DE ITEM */
    async _onItemCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        const type = header.dataset.type;
        const itemData = { name: `Novo(a) ${type}`, type: type };
        return await Item.create(itemData, { parent: this.actor });
    }

    /**
     * LÓGICA DE ROLAGEM CENTRAL (V3.0)
     */
    async _onRoll(event) {
        event.preventDefault();
        // ESTA LINHA DEVE SER A PRIMEIRA
        const dataset = event.currentTarget.dataset;

        // =========================================================
        // 0. AÇÕES ESPECIAIS DA HORDA
        // =========================================================
        if (dataset.rollType === 'horda-abraco') {
            ChatMessage.create({
                content: `
            <div class="extincao-roll horda-msg" style="border: 2px solid #ffaa00; background: #1a1500; color: #ffaa00; padding: 10px;">
                <h3 style="border-bottom: 1px solid #ffaa00; margin-bottom:5px;">🧟 ABRAÇO DA MORTE</h3>
                <p><strong>A Horda cercou um sobrevivente!</strong></p>
                <ul>
                    <li>🛑 <strong>IMOBILIZADO:</strong> Não pode mover.</li>
                    <li>🩸 <strong>DANO AUTOMÁTICO:</strong> Sofre <strong>2 Dano</strong> imediatamente.</li>
                    <li>☣️ <strong>RISCO:</strong> Faça um teste de Constituição (Vírus).</li>
                </ul>
            </div>`
            });
            return;
        }

        if (dataset.rollType === 'horda-fuga') {
            ChatMessage.create({
                content: `
            <div class="extincao-roll horda-msg" style="border: 2px solid #ffaa00; background: #1a1500; color: #ffaa00; padding: 10px;">
                <h3 style="border-bottom: 1px solid #ffaa00; margin-bottom:5px;">🏃 TENTATIVA DE FUGA</h3>
                <p>Para escapar do cerco, role <strong>FORÇA</strong>.</p>
                <div style="font-size: 1.5em; text-align:center; font-weight:bold; margin: 10px 0; border:1px dashed #ffaa00;">
                    DIFICULDADE: 2 SUCESSOS
                </div>
                <p style="font-size:0.8em"><em>Outro jogador pode ajudar (+1d6) atirando ou puxando.</em></p>
            </div>`
            });
            return;
        }

        // =========================================================
        // 1. ROLAGEM DE DADO DE USO (MUNIÇÃO / RECURSO)
        // =========================================================
        if (dataset.rollType == 'usage') {
            const itemId = dataset.itemId;
            const item = this.actor.items.get(itemId);
            const currentUd = item.system.uso;

            if (!currentUd || currentUd === "0") return;

            let roll = new Roll(`1${currentUd}`);
            await roll.evaluate();
            const result = roll.total;

            let degraded = false;
            let newUd = currentUd;

            if (result <= 2) {
                degraded = true;
                newUd = UD_CHAIN[currentUd] || "0";
                await item.update({ "system.uso": newUd });
            }

            let message = `
            <div class="extincao-roll">
                <h3 class="roll-label">Teste de Munição (${item.name})</h3>
                <div class="roll-result ${degraded ? 'failure' : 'success'}">${result}</div>
                <div class="roll-details">Dado: 1${currentUd}</div>
                ${degraded
                    ? `<div style="color:#ff4444; font-weight:bold; margin-top:5px; border-top:1px solid #333; padding-top:2px;">⚠️ RECURSO GASTO!<br><span style="font-size:0.8em">Caiu para: ${newUd === "0" ? "VAZIO" : newUd}</span></div>`
                    : `<div style="color:#4eff8c; margin-top:5px; border-top:1px solid #333; padding-top:2px;">Munição Preservada.</div>`}
            </div>`;

            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: "Dado de Uso",
                content: message
            });
            return;
        }

        // =========================================================
        // 2. ROLAGEM DE ITEM (EXIBIR CARTÃO)
        // =========================================================
        if (dataset.rollType == 'item') {
            const itemId = event.currentTarget.closest('.item').dataset.itemId;
            const item = this.actor.items.get(itemId);
            if (item) {
                ChatMessage.create({
                    user: game.user.id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    content: `
                <div class="extincao-roll item-card">
                    <div class="roll-label">${item.name}</div>
                    <div class="item-stats">
                        <p><strong>Dano Base:</strong> ${item.system.dano || 0}</p>
                        <p><strong>Uso:</strong> ${item.system.uso || "-"}</p>
                    </div>
                    <div class="item-desc" style="font-size:0.9em; margin-top:5px; color:#ccc;">${item.system.description || ""}</div>
                </div>`
                });
            }
            return;
        }

        // =========================================================
        // 3. ROLAGEM DE ATRIBUTO E PERÍCIA
        // =========================================================

        let diceCount = 0;
        let label = dataset.label;
        let poolFormula = "";
        let isInstinctRoll = false;
        let successThreshold = 6;
        let masteryActive = false;

        if (dataset.rollType === 'skill') {
            const skillKey = dataset.key;
            const attrKey = SKILL_MAP[skillKey] || "int";

            const skillVal = this.actor.system.skills[skillKey].value;
            const attrVal = this.actor.system.attributes[attrKey].value;
            const attrLabel = this.actor.system.attributes[attrKey].label;

            diceCount = attrVal + skillVal;
            label = `${dataset.label} (${attrLabel})`;
            poolFormula = `${attrVal} (Atributo) + ${skillVal} (Perícia)`;

            if (skillVal >= 4) {
                successThreshold = 5;
                masteryActive = true;
                poolFormula += " [MAESTRIA]";
            }
        }
        else if (dataset.key) {
            const attrKey = dataset.key;
            diceCount = this.actor.system.attributes[attrKey].value;
            poolFormula = `${diceCount} (Atributo)`;
        }

        // Regra do Instinto
        if (diceCount < 1) {
            diceCount = 1;
            isInstinctRoll = true;
            poolFormula += " -> INSTINTO";
        }

        let roll = new Roll(`${diceCount}d6`);
        await roll.evaluate();

        const results = roll.terms[0].results.map(d => d.result);
        let successes = 0;
        let sixes = 0;
        let ones = 0;

        for (let val of results) {
            if (val >= successThreshold) successes++;
            if (val === 6) sixes++;
            if (val === 1) ones++;
        }

        let isGlitch = false;
        if (isInstinctRoll) {
            if (results[0] <= 3) isGlitch = true;
        } else {
            if (successes === 0 && ones > 0) isGlitch = true;
        }

        let statusClass = successes > 0 ? 'success' : 'failure';
        let statusText = successes > 0 ? `${successes} SUCESSO(S)` : 'FALHA';

        if (isGlitch) {
            statusText = "GLITCH / CATÁSTROFE";
            statusClass = "glitch";
        }

        let messageContent = `
    <div class="extincao-roll">
        <h3 class="roll-label">${label}</h3>
        <div class="roll-result ${statusClass}">${statusText}</div>
        ${masteryActive ? '<div style="color:#4eff8c; font-size:0.8em; text-align:center; margin-bottom:2px;">★ MAESTRIA ATIVA (5+) ★</div>' : ''}
        ${isInstinctRoll ? '<div style="color:orange; font-size:0.8em; text-align:center; margin-bottom:2px;">⚠️ Dado de Instinto (Glitch 1-3)</div>' : ''}
        ${isGlitch ? '<div class="glitch-warning">A ARMA TRAVA / O CORPO FALHA</div>' : ''}
        <div class="roll-details">Pool: ${diceCount}d6 [${results.join(', ')}]<br><span style="font-size:0.8em; color:#666;">${poolFormula}</span></div>
        ${sixes > 0 ? `<div style="margin-top:5px; border-top:1px solid #333; padding-top:5px;"><strong style="color:#8b0000;">CRÍTICOS (6s): ${sixes}</strong><br><span style="font-size:0.8em; color:#888;">(Some este valor ao Dano da Arma)</span></div>` : ''}
    </div>`;

        roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: label,
            content: messageContent
        });
    }
}