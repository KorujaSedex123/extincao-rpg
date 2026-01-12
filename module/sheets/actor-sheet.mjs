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

        if (actorData.type === 'sobrevivente' || actorData.type === 'refugio') {
            this._prepareItems(context);
        }
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
        html.find('.daily-consumption').click(this._onDailyConsumption.bind(this));

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

        html.find('.item-open').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.actor.items.get(li.data("itemId"));
            if (item) item.sheet.render(true);
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
    async _onDailyConsumption(event) {
        event.preventDefault();

        // 1. Dados Iniciais
        const habitantes = this.actor.system.habitantes || [];
        const recursosAtuais = Number(this.actor.system.attributes.recursos.value) || 0;

        // 2. Contagem Inteligente (Ignora Mortos)
        // Se quiser que feridos consumam o dobro ou algo assim, ajustamos aqui.
        const bocasParaAlimentar = habitantes.filter(h => h.saude !== "morto").length;

        if (bocasParaAlimentar === 0) {
            ui.notifications.warn("O Refúgio está vazio (ou todos estão mortos). Sem consumo.");
            return;
        }

        // 3. Confirmação do Mestre
        const confirm = await Dialog.confirm({
            title: "Encerrar o Dia?",
            content: `<p>Existem <strong>${bocasParaAlimentar} sobreviventes</strong> vivos.</p>
                      <p>Isso consumirá <strong>${bocasParaAlimentar} unidades</strong> de Recursos.</p>
                      <p>Continuar?</p>`
        });

        if (!confirm) return;

        // 4. Cálculo e Atualização
        const novoEstoque = Math.max(0, recursosAtuais - bocasParaAlimentar);
        await this.actor.update({ "system.attributes.recursos.value": novoEstoque });

        // 5. Relatório no Chat (Flavor Text)
        let mensagem = "";
        let tipoMensagem = "normal";

        if (novoEstoque === 0 && recursosAtuais < bocasParaAlimentar) {
            // Caso Crítico: Faltou comida!
            const deficit = bocasParaAlimentar - recursosAtuais;
            mensagem = `<div class="extincao-roll failure">
                            <h3><i class="fas fa-exclamation-triangle"></i>CRISE DE RECURSOS</h3>
                            <p>O Refúgio consumiu tudo o que restava.</p>
                            <p><strong>Faltou comida para ${deficit} pessoas.</strong></p>
                            <hr>
                            <p>A Moral deve ser testada. A fome começa amanhã.</p>
                        </div>`;
        } else {
            // Caso Normal
            mensagem = `<div class="extincao-roll">
                            <h3><i class="fas fa-moon"></i> Relatório Diário</h3>
                            <p>O dia termina no Refúgio.</p>
                            <ul>
                                <li><strong>Sobreviventes:</strong> ${bocasParaAlimentar}</li>
                                <li><strong>Consumo:</strong> -${bocasParaAlimentar} Recursos</li>
                                <li><strong>Estoque Restante:</strong> ${novoEstoque}</li>
                            </ul>
                        </div>`;
        }

        // Envia para o chat
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: mensagem
        });
    }
    /** * @override 
     * Controla o que acontece quando algo é solto na ficha.
     * Permite arrastar Sobreviventes/NPCs para dentro do Refúgio.
     */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        const actor = this.actor;

        // --- LÓGICA: Arrastar Ator -> Refúgio (Cria Habitante) ---
        if (actor.type === 'refugio' && data.type === 'Actor') {
            const sourceActor = await fromUuid(data.uuid); // Pega o ator original
            if (!sourceActor) return;

            // 1. Determina a Função (Baseado no Arquétipo ou Tipo)
            let funcao = "Sobrevivente";
            if (sourceActor.type === 'npc') {
                funcao = sourceActor.system.details?.tipo || "NPC";
            } else if (sourceActor.type === 'sobrevivente') {
                funcao = sourceActor.system.details?.archetype || "Civil";
            }

            // 2. Calcula a Saúde Inicial (Baseado no PV atual)
            let saude = "saudavel";
            const pv = sourceActor.system.resources?.pv;
            if (pv) {
                if (pv.value <= 0) saude = "incapacitado";      // 0 PV
                else if (pv.value <= (pv.max / 2)) saude = "ferido"; // Menos da metade
                // Caso contrário mantém "saudavel"
            }
            const bioOriginal = sourceActor.system.details?.biography || "";
            const notasLimpas = bioOriginal.replace(/<[^>]*>?/gm, ' ').trim();

            // 3. Monta o Objeto do Habitante
            const novoHabitante = {
                nome: sourceActor.name,
                img: sourceActor.img || "icons/svg/mystery-man.svg",
                funcao: funcao.toUpperCase(),
                saude: saude, // Já calculado anteriormente
                notas: notasLimpas || "Sem registros anteriores."
            };

            // 4. Salva no Array do Refúgio
            const habitantes = actor.system.habitantes || []; // Pega existentes ou cria array novo
            habitantes.push(novoHabitante);

            // Feedback visual opcional
            ui.notifications.info(`${sourceActor.name} foi adicionado ao Refúgio.`);

            return actor.update({ "system.habitantes": habitantes });
        }

        // --- Comportamento Padrão ---
        // Se não for Ator->Refúgio, deixa o Foundry lidar (ex: soltar Itens no inventário)
        return super._onDrop(event);
    }
    async _onManageHabitante(event) {
        event.preventDefault();

        const index = event.currentTarget.dataset.index;
        const habitantes = this.actor.system.habitantes || [];
        const habitante = habitantes[index];

        // Verificação de Trava
        const isLocked = this.actor.getFlag("extincao", "sheetLocked");
        const disabledAttr = isLocked ? "disabled" : "";

        if (!habitante) return;

        // Gerar Dropdown de Saúde
        let optionsHtml = "";
        for (const [key, label] of Object.entries(SAUDE_HABITANTE)) { // Certifique-se que SAUDE_HABITANTE está definido no topo do arquivo
            const selected = (habitante.saude === key) ? "selected" : "";
            optionsHtml += `<option value="${key}" ${selected}>${label}</option>`;
        }

        // --- HTML MELHORADO DO MODAL ---
        const content = `
        <form class="habitante-modal" style="display:flex; flex-direction:column; gap:10px;">
            
            <div class="modal-top" style="display:flex; gap:15px; align-items:flex-start;">
                <div class="portrait-col">
                    <img src="${habitante.img}" style="border:1px solid #444; border-radius:4px; max-width:80px; height:auto; background:#000;" />
                </div>

                <div class="data-col" style="flex:1; display:flex; flex-direction:column; gap:5px;">
                    <div class="form-group">
                        <label style="font-weight:bold; color:#aaddff;">Nome:</label>
                        <input type="text" name="nome" value="${habitante.nome}" ${disabledAttr} style="width:100%; box-sizing:border-box;"/>
                    </div>
                    
                    <div class="form-group">
                        <label style="font-weight:bold; color:#ccc;">Função:</label>
                        <input type="text" name="funcao" value="${habitante.funcao}" ${disabledAttr} style="width:100%; box-sizing:border-box;"/>
                    </div>

                    <div class="form-group">
                        <label style="font-weight:bold; color:#4eff8c;">Estado:</label>
                        <select name="saude" ${disabledAttr} style="width:100%; box-sizing:border-box; background:#111; color:#fff;">
                            ${optionsHtml}
                        </select>
                    </div>
                </div>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #333; width: 100%; margin: 5px 0;">

            <div class="form-group" style="display:flex; flex-direction:column;">
                <label style="font-weight:bold; margin-bottom:5px;"><i class="fas fa-file-alt"></i> Notas / Biografia:</label>
                <textarea name="notas" ${disabledAttr} style="min-height:150px; background:#000; color:#ccc; padding:10px; border:1px solid #333; font-family:monospace; line-height:1.4;">${habitante.notas || ""}</textarea>
            </div>
            
            ${isLocked ? `<p style="color:#ff4444; font-style:italic; text-align:center; margin-top:5px; font-size:0.9em;"><i class="fas fa-lock"></i> MODO LEITURA (Ficha Travada)</p>` : ''}
        </form>
        `;

        // Botões do Dialog (Mantém a lógica de segurança)
        let buttons = {};

        if (isLocked) {
            buttons = { close: { label: "Fechar", icon: "<i class='fas fa-times'></i>" } };
        } else {
            buttons = {
                save: {
                    label: "Salvar Alterações",
                    icon: "<i class='fas fa-save'></i>",
                    callback: async (html) => {
                        const nome = html.find('input[name="nome"]').val();
                        const funcao = html.find('input[name="funcao"]').val();
                        const saude = html.find('select[name="saude"]').val();
                        const notas = html.find('textarea[name="notas"]').val();

                        // Atualiza mantendo a imagem original (ou adicionando lógica para editar img depois se quiser)
                        habitantes[index] = { ...habitante, nome, funcao, saude, notas };
                        await this.actor.update({ "system.habitantes": habitantes });
                    }
                },
                delete: {
                    label: "Expulsar/Excluir",
                    icon: "<i class='fas fa-trash'></i>",
                    callback: async () => {
                        const confirm = await Dialog.confirm({ title: "Excluir Habitante?", content: "Essa ação removerá o registro permanentemente." });
                        if (confirm) {
                            habitantes.splice(index, 1);
                            await this.actor.update({ "system.habitantes": habitantes });
                        }
                    }
                }
            };
        }

        new Dialog({
            title: `Arquivo: ${habitante.nome}`,
            content: content,
            buttons: buttons,
            default: isLocked ? "close" : "save",
            width: 400 // Alarga um pouco o modal para ficar mais confortável
        }).render(true);
    }

    /** @override */
    /** * @override */
    /** * @override */
    async _onDrop(event) {
        // 1. Captura Segura dos Dados (Compatível V12/V13)
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData("text/plain"));
        } catch (err) {
            return super._onDrop(event);
        }

        const actor = this.actor;

        // 2. Lógica Apenas para Refúgio recebendo Ator
        if (actor.type === 'refugio' && data.type === 'Actor') {
            const sourceActor = await fromUuid(data.uuid);
            if (!sourceActor) return;

            // --- A. DEFINIR FUNÇÃO ---
            let funcao = "Sobrevivente";
            if (sourceActor.type === 'npc') {
                // Tenta pegar o tipo do NPC ou usa genérico
                funcao = sourceActor.system.details?.tipo || "NPC";
            } else if (sourceActor.type === 'sobrevivente') {
                // Pega o Arquétipo (ex: "A Médica")
                funcao = sourceActor.system.details?.archetype || "Civil";
            }

            // --- B. CÁLCULO DE SAÚDE (PV + INFECÇÃO) ---
            let saude = "saudavel";
            const pv = sourceActor.system.resources?.pv;
            const infectionStage = sourceActor.system.details?.infection || "0"; // "0","1","2","3"

            // B1. Prioridade: Infecção (Apenas Sobreviventes)
            if (sourceActor.type === 'sobrevivente') {
                switch (infectionStage) {
                    case "1": saude = "ferido"; break;       // Incubação (Alerta)
                    case "2": saude = "doente"; break;       // Febre
                    case "3": saude = "incapacitado"; break; // Necrose
                    default: saude = "saudavel";
                }
            }

            // B2. Verificação de PV (Dano Físico)
            // Se o PV estiver crítico, piora o estado (exceto se já for grave pela infecção)
            if (pv) {
                const atual = Number(pv.value) || 0;
                const max = Number(pv.max) || 1;

                if (atual <= 0) {
                    saude = "incapacitado"; // Ou "morto"
                } else if (atual <= (max / 2) && saude === "saudavel") {
                    saude = "ferido";
                }
            }

            // --- C. PUXAR DOSSIÊ (BIOGRAFIA) ---
            // Pega o HTML da bio e remove as tags para ficar texto puro nas Notas
            const rawBio = sourceActor.system.details?.biography || "";
            // Regex: Remove tudo entre < e > e decodifica espaços
            const cleanBio = rawBio.replace(/<[^>]*>?/gm, ' ')
                .replace(/&nbsp;/g, ' ')
                .trim();

            const dossieFinal = cleanBio.length > 0 ? cleanBio : "Sem registros no dossiê original.";

            // --- D. CRIAÇÃO E SALVAMENTO ---
            const novoHabitante = {
                nome: sourceActor.name,
                img: sourceActor.img || "icons/svg/mystery-man.svg",
                funcao: funcao.toUpperCase(), // Estética
                saude: saude,
                notas: dossieFinal
            };

            // Adiciona ao array existente
            const habitantes = (actor.system.habitantes || []).slice();
            habitantes.push(novoHabitante);

            // Atualiza a ficha
            await actor.update({ "system.habitantes": habitantes });

            ui.notifications.info(`Refúgio: ${sourceActor.name} registrado(a). Estado: ${saude.toUpperCase()}.`);

            return; // Impede comportamento padrão
        }

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