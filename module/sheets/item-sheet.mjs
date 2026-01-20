import { EXTINCAO } from "../helpers/config.mjs";

const ItemSheet = foundry.appv1.sheets.ItemSheet;

export class ExtincaoItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["extincao", "sheet", "item", "extincao-sheet"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
    });
  }

  /** * AQUI ESTAVA O PROBLEMA:
   * Antes retornava sempre "item-sheet.hbs".
   * Agora ele pega o TIPO do item para escolher o arquivo certo.
   * Ex: se for "habitante", vai buscar "item-habitante-sheet.hbs"
   */
  get template() {
    const path = "systems/extincao/templates/item";
    
    // Retorna: systems/extincao/templates/item/item-arma-sheet.hbs
    // Retorna: systems/extincao/templates/item/item-habitante-sheet.hbs
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  async getData() {
    const context = super.getData();
    context.system = context.item.system;
    context.flags = context.item.flags;
    context.config = EXTINCAO;

    // --- LÓGICA DE TRAVA (herdada do Ator) ---
    // Se o item pertence a um ator, e o ator está travado:
    if (this.item.actor) {
        context.isLocked = this.item.actor.getFlag("extincao", "sheetLocked");
    } else {
        context.isLocked = false;
    }
    
    // Dados úteis para as fichas
    context.isArma = context.item.type === "arma";
    context.isEquipamento = context.item.type === "equipamento";
    context.isHabitante = context.item.type === "habitante"; // Flag útil

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // Se tiver listeners específicos de item, adicione aqui
  }
}