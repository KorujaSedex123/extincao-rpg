/**
 * EXTINÇÃO RPG - COMBAT SYSTEM
 * Controla a Iniciativa customizada (Des + 1d6) e regras da Horda.
 */
export class ExtincaoCombat extends Combat {

    /** @override */
    async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
        
        // 1. Estrutura para guardar as atualizações
        const updates = [];
        const messages = [];

        // 2. Itera sobre os combatentes selecionados para rolar
        for (const id of ids) {
            const combatant = this.combatants.get(id);
            if (!combatant) continue;

            const actor = combatant.actor;
            if (!actor) {
                updates.push({ _id: id, initiative: 0 });
                continue;
            }

            // --- REGRAS DE INICIATIVA ---
            
            let initFormula = "";
            let initValue = 0;
            // Tradução: "Iniciativa"
            const labelInit = game.i18n.localize("EXTINCAO.Combat.Initiative");

            // REGRA 1: A HORDA (Sempre Último / Zero)
            if (actor.type === 'horda') {
                initValue = 0;
                
                // Cria mensagem de chat simples sem rolagem de dados
                messages.push({
                    speaker: ChatMessage.getSpeaker({ actor: actor }),
                    content: `<div class="extincao-roll" style="border-left-color: #f44;">
                                <h3>${labelInit}: A Horda</h3>
                                <div class="roll-result failure" style="background:#200; color:#f44; border-color:#500;">
                                    ${game.i18n.localize("EXTINCAO.Combat.HordaWait")}
                                </div>
                              </div>`
                });
            }
            
            // REGRA 2: SOBREVIVENTES E NPCs (Des + 1d6)
            else {
                const des = actor.system.attributes?.des?.value || 0;
                // Fórmula: 1d6 + Destreza
                initFormula = `1d6 + ${des}`;
                
                // Rola os dados
                const roll = await new Roll(initFormula).evaluate();
                initValue = roll.total;
                
                // Exibe os dados 3D se tiver o módulo Dice So Nice
                if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);

                // Monta a mensagem de chat estilizada
                const diceHTML = roll.terms[0].results.map(r => 
                    `<span class="mini-die ${r.result===6?'crit':''}">${r.result}</span>`
                ).join("");

                // Tradução: "Destreza"
                const attrLabel = game.i18n.localize("EXTINCAO.Attribute.Des") || "Destreza";

                messages.push({
                    speaker: ChatMessage.getSpeaker({ actor: actor }),
                    content: `<div class="extincao-roll" style="border-left-color: #4da;">
                                <h3>${labelInit}: ${actor.name}</h3>
                                <div style="font-size:0.8em; color:#888;">${attrLabel} (${des}) + 1d6</div>
                                <div class="dice-pool" style="justify-content:center; margin:5px 0;">${diceHTML}</div>
                                <div class="roll-result success" style="font-size:1.5em; border-color:#4da; color:#4da;">
                                    ${initValue}
                                </div>
                              </div>`
                });
            }

            // Adiciona à lista de atualizações
            updates.push({ _id: id, initiative: initValue });
        }

        // 3. Atualiza o Combat Tracker (FUNDAMENTAL)
        if (!updates.length) return this;
        await this.updateEmbeddedDocuments("Combatant", updates);

        // 4. Garante que o turno comece se necessário
        if (updateTurn) await this.update({ turn: 0 });

        // 5. Envia as mensagens para o chat
        if (messages.length > 0) {
            ChatMessage.implementation.create(messages);
        }

        return this;
    }
}