// --- CORREÇÃO V12: Definir o caminho da classe ItemSheet ---
const ItemSheet = foundry.appv1.sheets.ItemSheet;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class BoilerplateItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["boilerplate", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/extincao/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.hbs`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `item-weapon-sheet.hbs`.
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.item;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;
    const parentLocked = this.item.actor?.getFlag("extincao", "sheetLocked");
    if (parentLocked) {
      context.isLocked = true;
      context.editable = false; // Isso desabilita o salvamento padrão do formulário em alguns casos
      // Mas para nossos inputs manuais, usaremos a flag `isLocked` nos templates
    } else {
      context.isLocked = false;
    }

    // Enrich description info for display
    // Text Editor (V12)
    const editorClass = foundry.applications?.ux?.TextEditor ?? TextEditor;
    context.system.enrichedDescription = await editorClass.enrichHTML(context.system.description, { async: true });

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click listeners, etc. would go here.
  }
}