/**
 * Ficha de Item para o Sistema EXTINÇÃO
 */
export class BoilerplateItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      // ADICIONADO 'extincao-sheet' AQUI PARA PEGAR O TEMA ESCURO
      classes: ["boilerplate", "sheet", "item", "extincao-sheet"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/extincao/templates/item";
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /** @override */
  getData() {
    const context = super.getData();
    const itemData = context.item;
    context.system = itemData.system;
    context.flags = itemData.flags;
    context.config = CONFIG.BOILERPLATE;
    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
  }
}