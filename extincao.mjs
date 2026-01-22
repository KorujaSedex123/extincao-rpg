/**
 * EXTINÇÃO RPG SYSTEM
 * Arquivo principal de inicialização
 */

// 1. IMPORTA AS CLASSES DE DOCUMENTO (Isso traz a função .roll() para o sistema)
import { ExtincaoActor } from "./module/documents/actor.mjs";
import { ExtincaoItem } from "./module/documents/item.mjs";

// Importa as nossas classes de Ficha
import { preloadHandlebarsTemplates } from "./module/helpers/templates.mjs";
import { ExtincaoActorSheet } from "./module/sheets/actor-sheet.mjs";
import { ExtincaoItemSheet } from "./module/sheets/item-sheet.mjs";
import { ExtincaoCombat } from "./module/combat.mjs";
import { createExtincaoMacro, rollItemMacro } from "./module/helpers/macros.mjs";
import { registerSettings } from "./module/settings.mjs";
import { taskRoll, rollNoise } from "./module/helpers/dice.mjs"; 

/* -------------------------------------------- */
/* Inicialização do Sistema                     */
/* -------------------------------------------- */

Hooks.once('init', async function () {
    console.log(`EXTINÇÃO | Inicializando o Sistema...`);

    registerSettings();

    game.extincao = {
        ExtincaoActor,
        createExtincaoMacro,
        rollItemMacro,
        rollNoise
    };

    // 2. REGISTRA AS CLASSES NO CONFIG (Correção do erro item.roll)
    CONFIG.Actor.documentClass = ExtincaoActor;
    CONFIG.Item.documentClass = ExtincaoItem;
    CONFIG.Combat.documentClass = ExtincaoCombat;

    // Definindo as constantes com os caminhos novos
    const Actors = foundry.documents.collections.Actors;
    const Items = foundry.documents.collections.Items;
    const ActorSheet = foundry.appv1.sheets.ActorSheet;
    const ItemSheet = foundry.appv1.sheets.ItemSheet;

    // Desregistra fichas do Core
    Actors.unregisterSheet("core", ActorSheet);
    Items.unregisterSheet("core", ItemSheet);

    // Registra Ficha de Ator (Extinção)
    Actors.registerSheet("extincao", ExtincaoActorSheet, {
        types: ["sobrevivente", "npc", "horda", "refugio"],
        makeDefault: true,
        label: "Ficha Extinção"
    });

    // Registra Ficha de Item (Extinção)
    Items.registerSheet("extincao", ExtincaoItemSheet, {
        makeDefault: true,
        label: "Ficha de Item Extinção"
    });

    // -----------------------------------------------------------
    // HELPER: PERCENTAGE (Para Barra de Vida da Horda)
    // -----------------------------------------------------------
    Handlebars.registerHelper('percentage', function (value, max) {
        let v = Number(value) || 0;
        let m = Number(max) || 1;
        if (m === 0) return 0;
        return Math.round((v * 100) / m);
    });

    // -----------------------------------------------------------
    // HELPER: SELECT (Para Dropdowns funcionarem)
    // -----------------------------------------------------------
    Handlebars.registerHelper('select', function (value, options) {
        const $el = $('<select />').html(options.fn(this));
        $el.find('[value="' + value + '"]').attr({ 'selected': 'selected' });
        return $el.html();
    });

    // Carrega os templates HTML (Função definida no final deste arquivo)
    return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/* Mensagem de Boas Vindas (Hook Ready)         */
/* -------------------------------------------- */
Hooks.once("ready", async function () {

    // 1. Verifica Configuração
    const showWelcome = game.settings.get("extincao", "welcomeMessage");
    if (!showWelcome) return;

    // 2. PEGA A VERSÃO DINAMICAMENTE
    const version = game.system.version;

    // 3. CARREGA OS TEXTOS TRADUZIDOS (i18n)
    const title = game.i18n.localize("EXTINCAO.Welcome.Title");
    const intro = game.i18n.localize("EXTINCAO.Welcome.Intro");
    const msg = game.i18n.localize("EXTINCAO.Welcome.Message");
    const tipLabel = game.i18n.localize("EXTINCAO.Welcome.TipLabel");
    const tip = game.i18n.localize("EXTINCAO.Welcome.Tip");
    const btnLabel = game.i18n.localize("EXTINCAO.Welcome.Button");

    // Monta o subtítulo com a versão (Use game.i18n.format se quiser injetar variáveis, mas concatenação simples serve aqui)
    const subtitle = `v.${version} // ${game.i18n.localize("EXTINCAO.Welcome.Subtitle")}`;

    // 4. Monta o HTML (Agora limpo de textos fixos)
    const content = `
    <div class="extincao-chat-card" style="background: #050505; border: 1px solid #333; border-left: 4px solid #4da; box-shadow: 0 0 10px rgba(77, 221, 170, 0.2);">
        
        <div style="background: linear-gradient(90deg, #111 0%, #000 100%); padding: 10px; display: flex; align-items: center; border-bottom: 1px solid #222;">
            <img src="icons/svg/biohazard.svg" style="width: 40px; height: 40px; margin-right: 15px; filter: invert(1) drop-shadow(0 0 5px #4da);">
            <div>
                <h3 style="margin: 0; color: #4da; font-family: 'Courier New', monospace; letter-spacing: 2px; text-transform: uppercase;">
                    ${title}
                </h3>
                <div style="font-size: 0.7em; color: #888;">${subtitle}</div>
            </div>
        </div>

        <div style="padding: 15px; color: #ccc; font-family: 'Segoe UI', sans-serif; font-size: 0.95em; line-height: 1.5;">
            <p style="margin-bottom: 10px;">
                <strong style="color: #fff;">${intro}</strong>
            </p>
            <p>${msg}</p>
            
            <div style="margin-top: 15px; padding: 10px; background: #111; border-left: 3px solid #f44; font-size: 0.85em; color: #aaa;">
                <i class="fas fa-info-circle" style="color: #f44;"></i> <strong>${tipLabel}</strong><br>
                ${tip}
            </div>
        </div>

        <div style="padding: 5px; background: #080808; text-align: center; border-top: 1px solid #222;">
            <button onclick="game.settings.set('extincao', 'welcomeMessage', false)" 
                style="background: transparent; border: none; color: #555; font-size: 0.8em; cursor: pointer; width: auto;">
                <i class="fas fa-eye-slash"></i> ${btnLabel}
            </button>
        </div>
    </div>
    `;

    ChatMessage.create({
        speaker: { alias: "SISTEMA" },
        content: content,
        whisper: [game.user.id]
    });
});
/* -------------------------------------------- */
/* Hotbar Macros (Arrastar e Soltar)           */
/* -------------------------------------------- */
Hooks.on("hotbarDrop", (bar, data, slot) => createExtincaoMacro(data, slot));

/* -------------------------------------------- */
/* Automação de Nomes (Inimigo 1, 2...)         */
/* -------------------------------------------- */
Hooks.on("preCreateActor", (actor, data, options, userId) => {
    const isDefaultName = data.name.startsWith("Actor") || data.name.startsWith("New Actor") || data.name.startsWith("Novo Ator");

    if (isDefaultName) {
        let baseName = "Ator";
        if (data.type === "npc") baseName = "Inimigo";
        else if (data.type === "horda") baseName = "A Horda";
        else if (data.type === "sobrevivente") baseName = "Sobrevivente";
        else if (data.type === "refugio") baseName = "Refúgio";

        // Conta quantos existem para dar numero (Ex: Inimigo 3)
        const count = game.actors.filter(a => a.type === data.type).length + 1;
        actor.updateSource({ name: `${baseName} ${count}` });
    }
});

/* ==========================================================================
   LÓGICA DE FORÇAR ROLAGEM (COM DICE SO NICE)
   ========================================================================== */
Hooks.on("renderChatMessageHTML", (message, html) => {

    const btn = html.querySelector(".force-roll-btn");
    if (!btn) return;

    btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        let rollData;
        try { rollData = JSON.parse(btn.dataset.roll); }
        catch (err) { return ui.notifications.error("Erro ao ler dados."); }

        const actor = game.actors.get(rollData.actorId);
        if (!actor) return ui.notifications.error("Ator não encontrado.");

        // 1. Aplica Custo
        const currentStress = Number(actor.system.resources.estresse.value);
        if (currentStress >= 6) return ui.notifications.warn("Estresse máximo!");

        await actor.update({ "system.resources.estresse.value": currentStress + 1 });

        // 2. UI do Botão
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-check"></i> FORÇADO!';
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";

        // 3. Rola os dados
        let roll = new Roll(`${rollData.diceCount}d6`);
        await roll.evaluate();

        // Dice So Nice
        if (game.dice3d) {
            game.dice3d.showForRoll(roll, game.user, true);
        }

        const diceResults = roll.terms[0].results;
        let successCount = 0;
        let hasCrit = false;
        let diceHTML = "";

        for (let die of diceResults) {
            const val = die.result;
            let cssClass = "";

            if (val === 6) {
                successCount++;
                hasCrit = true;
                cssClass = "crit";
            }
            else if (val >= rollData.targetNumber) {
                successCount++;
                cssClass = "success";
            }
            else if (val === 1) { cssClass = "glitch"; }

            diceHTML += `<span class="mini-die ${cssClass}">${val}</span>`;
        }

        // 4. Resultado Final
        let outcomeHTML = "";
        let borderSideColor = "#666";

        if (successCount > 0) {
            borderSideColor = "#4eff8c";
            const critText = hasCrit ? `<div style="font-size:0.6em; color:#fff; letter-spacing:2px; border-top:1px dashed #444; margin-top:5px; padding-top:2px;">CRÍTICO!</div>` : "";

            outcomeHTML = `
                <div class="roll-result success">
                    SALVO! (${successCount} Sucessos)
                    ${critText}
                </div>`;
        } else {
            borderSideColor = "#f44";
            outcomeHTML = `
                <div class="roll-result failure" style="color:#f44; border-color:#f44;">GLITCH!</div>
                <div class="roll-summary glitch-text">O limite foi quebrado...</div>`;
        }

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: `
            <div class="extincao-roll" style="border-left-color: ${borderSideColor}">
                <h3>${rollData.label} (FORÇADO)</h3>
                <div style="font-size:0.8em; color:#f44; margin-bottom:5px; text-align:center;">
                    <i class="fas fa-bolt"></i> +1 ESTRESSE APLICADO
                </div>
                
                <div class="dice-pool">
                    ${diceHTML}
                </div>

                ${outcomeHTML}
            </div>`
        });
    });
});