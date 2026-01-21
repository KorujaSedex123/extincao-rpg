import { taskRoll } from "./dice.mjs";

/**
 * Cria um Macro quando um item é arrastado para a barra de atalhos
 */
export async function createExtincaoMacro(data, slot) {
    // Verifica se é um Item
    if (data.type !== "Item") return;
    
    // Verifica se o item tem um UUID (identificador único)
    if (!data.uuid) return;

    const item = await fromUuid(data.uuid);

    // Cria o comando do script. 
    // Ele vai chamar uma função global que definiremos no extincao.mjs
    const command = `game.extincao.rollItemMacro("${item.name}");`;

    // Verifica se esse macro já existe para não criar duplicados
    let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
    
    if (!macro) {
        macro = await Macro.create({
            name: item.name,
            type: "script",
            img: item.img,
            command: command,
            flags: { "extincao.itemMacro": true }
        });
    }

    // Atribui o macro ao slot da barra
    game.user.assignHotbarMacro(macro, slot);
    return false; // Impede o comportamento padrão do Foundry
}

/**
 * Função executada ao clicar no botão da barra
 */
export function rollItemMacro(itemName) {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    
    // Tenta pegar o ator do Token selecionado ou o Ator padrão do usuário
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);

    // Validações
    if (!actor) return ui.notifications.warn("Você precisa selecionar um token ou personagem para usar este macro.");

    // Busca o item pelo nome no inventário do ator
    const item = actor.items.find(i => i.name === itemName);
    if (!item) return ui.notifications.warn(`Seu personagem não possui o item "${itemName}".`);

    // --- AÇÃO DO MACRO ---
    
    // 1. Se for Arma -> Rola Ataque (com Modal)
    if (item.type === 'arma') {
        return taskRoll(actor, { rollType: 'item', label: `Ataque: ${item.name}` }, item);
    }
    
    // 2. Outros Itens -> Mostra o Card de Info
    return item.roll();
}