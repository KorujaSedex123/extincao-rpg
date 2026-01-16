/**
 * EXTINÇÃO RPG SYSTEM
 * Arquivo principal de inicialização (Compatível V12+)
 */

import { BoilerplateActorSheet } from "./sheets/actor-sheet.mjs";
import { BoilerplateItemSheet } from "./sheets/item-sheet.mjs";
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { registerHandlebarsHelpers } from "./helpers/handlebars.mjs";

/* -------------------------------------------- */
/* Inicialização do Sistema                    */
/* -------------------------------------------- */

Hooks.once('init', async function () {
    console.log(`EXTINÇÃO | Inicializando o Sistema...`);

    // Adiciona classes customizadas ao CONFIG
    CONFIG.Actor.documentClass = Actor;
    CONFIG.Item.documentClass = Item;

    // --- REGISTRO DE FICHAS (SINTAXE V12 SEM AVISOS) ---

    // 1. Desregistra as fichas padrão do sistema "core"
    // O erro diz que "Actors" global é depreciado, então usamos o caminho completo:
    // foundry.documents.collections.Actors
    // Mas para registerSheet, acessamos a coleção "actors" do jogo ou a classe.

    // A maneira mais segura e moderna é acessar via 'Actors' do namespace 'foundry.documents.collections'
    const Actors = foundry.documents.collections.Actors;
    const Items = foundry.documents.collections.Items;
    // Para ActorSheet e ItemSheet, o erro aponta para 'foundry.appv1.sheets'
    const ActorSheet = foundry.appv1.sheets.ActorSheet;
    const ItemSheet = foundry.appv1.sheets.ItemSheet;

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("extincao", BoilerplateActorSheet, {
        types: ["sobrevivente", "npc", "horda", "refugio"],
        makeDefault: true,
        label: "Ficha Padrão Extinção"
    });

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("extincao", BoilerplateItemSheet, {
        makeDefault: true,
        label: "Ficha de Item Extinção"
    });

    // Registra os Helpers
    registerHandlebarsHelpers();

    // Carrega os templates HTML
    return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/* Automação de Nomes (Inimigo 1, 2...)        */
/* -------------------------------------------- */
Hooks.on("preCreateActor", (actor, data, options, userId) => {
    const isDefaultName = data.name.startsWith("Actor") || data.name.startsWith("New Actor");

    if (isDefaultName) {
        let baseName = "Ator";
        if (data.type === "npc") baseName = "Inimigo";
        else if (data.type === "horda") baseName = "A Horda";
        else if (data.type === "sobrevivente") baseName = "Sobrevivente";
        else if (data.type === "refugio") baseName = "Refúgio";

        // Conta quantos existem
        const count = game.actors.filter(a => a.type === data.type).length + 1;

        actor.updateSource({ name: `${baseName} ${count}` });
    }
});

/* ==========================================================================
   LÓGICA DE FORÇAR ROLAGEM (COM DICE SO NICE + V13 READY)
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

        // ---------------------------------------------------------
        // CORREÇÃO: FORÇAR DICE SO NICE A APARECER
        // ---------------------------------------------------------
        if (game.dice3d) {
            // (rolagem, usuário, sincronizar_com_outros)
            game.dice3d.showForRoll(roll, game.user, true);
        }
        // ---------------------------------------------------------

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