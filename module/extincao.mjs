// Importa a Ficha (Visual)
import { BoilerplateActorSheet } from "./sheets/actor-sheet.mjs";
import { BoilerplateItemSheet } from "./sheets/item-sheet.mjs";
import { ExtincaoActor } from "./documents/actor.mjs";

Hooks.once("init", async function () {
    console.log("EXTINÇÃO | Inicializando o Sistema...");

    // Define que a lógica dos Atores vem do nosso arquivo actor.mjs
    CONFIG.Actor.documentClass = ExtincaoActor;
    Handlebars.registerHelper('or', function (a, b) {
        return a || b;
    });

    /* -------------------------------------------- */
    /* NOMEAÇÃO AUTOMÁTICA DE ATORES               */
    /* -------------------------------------------- */
    Hooks.on("preCreateActor", (actor, data, options, userId) => {
        // Verifica se o nome é o padrão genérico (ex: "Actor", "New Actor")
        const isDefaultName = data.name.startsWith("Actor") || data.name.startsWith("New Actor");

        if (isDefaultName) {
            // Define o nome base conforme o tipo
            let baseName = "Ator";
            if (data.type === "npc") baseName = "Inimigo";
            else if (data.type === "horda") baseName = "A Horda";
            else if (data.type === "sobrevivente") baseName = "Sobrevivente";

            // Conta quantos atores desse tipo já existem para dar o número
            // Ex: Se já tem 2 NPCs, o próximo será "Inimigo 3"
            const count = game.actors.filter(a => a.type === data.type).length + 1;

            // Atualiza o nome do ator antes dele ser criado no banco de dados
            actor.updateSource({ name: `${baseName} ${count}` });
        }
    });

    // Desregistra fichas antigas e registra as novas
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("extincao", BoilerplateActorSheet, {
        types: ["sobrevivente", "npc", "horda"], // <--- AQUI ESTAVA FALTANDO NPC E HORDA
        makeDefault: true
    });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("extincao", BoilerplateItemSheet, {
        makeDefault: true
    });

    // Helper de Loop para a barra de estresse
    Handlebars.registerHelper("range", function (start, end) {
        let arr = [];
        for (let i = start; i <= end; i++) {
            arr.push(i);
        }
        return arr;
    });

    // Helper de Igualdade e Comparação (para os checkboxes e condicionais)
    Handlebars.registerHelper("eq", function (a, b) { return a === b; });
    Handlebars.registerHelper("lte", function (a, b) { return a <= b; });
    Handlebars.registerHelper("gte", function (a, b) { return a >= b; });
    loadTemplates([
        "systems/extincao/templates/actor/parts/skill-row.hbs"
    ]);
});