/**
 * Define os caminhos dos templates HTML para pré-carregamento
 */
export const preloadHandlebarsTemplates = async function() {
  
  // Define o caminho completo da função
  const loadTemplates = foundry.applications.handlebars.loadTemplates;

  return loadTemplates([
    // --- PARTES (Pedaços da Ficha) ---
    // Certifique-se que esses arquivos existem na pasta templates/actor/parts/
    "systems/extincao/templates/actor/parts/actor-items.hbs", 
    "systems/extincao/templates/actor/parts/skill-row.hbs",
    
    // --- FUTURO (Comentei para não dar erro enquanto você não cria os arquivos) ---
    // "systems/extincao/templates/actor/parts/actor-effects.hbs",
    // "systems/extincao/templates/actor/parts/actor-features.hbs",
    // "systems/extincao/templates/actor/parts/actor-spells.hbs",
    // "systems/extincao/templates/item/parts/item-effects.hbs",

    // --- TEMPLATES PRINCIPAIS (Fichas) ---
    
    // 1. Sobrevivente (Nome atualizado)
    "systems/extincao/templates/actor/actor-sobrevivente-sheet.hbs",
    
    // 2. NPC
    "systems/extincao/templates/actor/actor-npc-sheet.hbs",
    
    // 3. Horda
    "systems/extincao/templates/actor/actor-horda-sheet.hbs",
    
    // 4. Item (Arma)
    "systems/extincao/templates/item/item-arma-sheet.hbs"
  ]);
};