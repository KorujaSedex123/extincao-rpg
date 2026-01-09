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

Hooks.once('init', async function() {
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
      types: ["sobrevivente", "npc", "horda", "base"],
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
        else if (data.type === "base") baseName = "Refúgio";

        // Conta quantos existem
        const count = game.actors.filter(a => a.type === data.type).length + 1;

        actor.updateSource({ name: `${baseName} ${count}` });
    }
});