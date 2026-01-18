import { EXTINCAO } from "../helpers/config.mjs";

const ItemSheet = foundry.appv1.sheets.ItemSheet;
export class ExtincaoItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["extincao", "sheet", "item", "extincao-sheet"],
      width: 500,
      height: 450, // Um pouco mais compacto
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
    });
  }

  get template() {
    return `systems/extincao/templates/item/item-sheet.hbs`;
  }

  async getData() {
    const context = super.getData();
    context.system = context.item.system;
    context.flags = context.item.flags;
    
    context.isArma = context.item.type === "arma";
    context.isEquipamento = context.item.type === "equipamento";
    context.isItem = context.item.type === "item";
    context.config = EXTINCAO; 

    // --- LÓGICA DE TRAVA (herdada do Ator) ---
    // Se o item pertence a um ator, e o ator está com a ficha travada:
    if (this.item.actor) {
        context.isLocked = this.item.actor.getFlag("extincao", "sheetLocked");
    } else {
        context.isLocked = false;
    }
    
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
  }
}