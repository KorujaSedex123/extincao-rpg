/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class ExtincaoItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }
/**
   * Envia o Card do Item para o chat (Info)
   */
  async roll() {
    const item = this;
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    
    // Renderiza o HTML do template que criamos
    const content = await renderTemplate("systems/extincao/templates/chat/item-card.hbs", {
      item: item,
      data: item.system
    });

    // Cria a mensagem no chat
    ChatMessage.create({
      speaker: speaker,
      content: content,
      // flavor: "Item Equipado", // Opcional
    });
  }

}
