/**
 * Pré-carrega os templates HTML para evitar delay e erros de "partial not found"
 */
export const preloadHandlebarsTemplates = async function() {
  
  // Define o caminho completo da função para evitar aviso de depreciação
  const loadTemplates = foundry.applications.handlebars.loadTemplates;

  return loadTemplates([
    // --- PARTES DE ATORES ---
    "systems/extincao/templates/actor/parts/actor-items.hbs",    // <--- O QUE FALTAVA
    "systems/extincao/templates/actor/parts/skill-row.hbs",
    
    // Sugiro já deixar estes registrados para evitar erros futuros se usar Efeitos ou Magias:
    "systems/extincao/templates/actor/parts/actor-effects.hbs",
    "systems/extincao/templates/actor/parts/actor-features.hbs",
    "systems/extincao/templates/actor/parts/actor-spells.hbs",

    // --- PARTES DE ITENS ---
    "systems/extincao/templates/item/parts/item-effects.hbs"
  ]);
};