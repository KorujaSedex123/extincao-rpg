/**
 * Pré-carrega os templates HTML para evitar delay na abertura das fichas
 */
export const preloadHandlebarsTemplates = async function() {
  
  // Define o caminho completo da função para evitar aviso de depreciação
  const loadTemplates = foundry.applications.handlebars.loadTemplates;

  return loadTemplates([
    // Lista de Parciais (Parts)
    "systems/extincao/templates/actor/parts/skill-row.hbs"
  ]);
};