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

/* -------------------------------------------- */
/* HOOK: ATIVAR BOTÕES NO CHAT (Padrão V13+)   */
/* -------------------------------------------- */
Hooks.on("renderChatMessageHTML", (message, html) => {
    // Na V13+, 'html' já é o elemento HTML nativo.
    // Procuramos o botão dentro dele.
    const btn = html.querySelector(".force-roll-btn");
    
    // Se não tiver botão nesta mensagem, ignora.
    if (!btn) return;

    // Adiciona o ouvinte de clique
    btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        
        // Pega o ID do ator
        const actorId = btn.dataset.actorId;
        const actor = game.actors.get(actorId);

        if (!actor) return ui.notifications.warn("Ator original não encontrado.");

        // Verifica Estresse
        const estresseAtual = actor.system.resources.estresse.value;
        if (estresseAtual >= 6) {
            return ui.notifications.error("COLAPSO! O personagem não pode forçar mais nada.");
        }

        // 1. Atualiza Estresse
        await actor.update({ "system.resources.estresse.value": estresseAtual + 1 });
        
        // 2. Trava o botão para evitar cliques duplos
        btn.disabled = true;
        btn.innerHTML = "Forçado!";
        btn.classList.add("used"); // Classe extra para o CSS

        // 3. Rola o Dado de Esforço (+1d6)
        let r = new Roll("1d6");
        await r.evaluate();
        
        // 4. Define o visual do resultado
        let resultadoClass = "failure";
        let textoResultado = "FALHA";
        
        if (r.total === 6) {
            resultadoClass = "success";
            textoResultado = "SUCESSO!";
        } else if (r.total === 1) {
            resultadoClass = "glitch";
            textoResultado = "GLITCH!";
        }

        // 5. Envia a mensagem do resultado
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: `
            <div class="extincao-roll">
                <h3>FORÇAR AÇÃO</h3>
                <div class="roll-result ${resultadoClass}">
                    ${r.total} <span style="font-size:0.5em; display:block;">${textoResultado}</span>
                </div>
                <div style="text-align:center; font-size:0.8em; margin-top:5px; color:#ff8800;">
                    ⚠️ +1 Estresse Aplicado
                </div>
            </div>`
        });
    });
});