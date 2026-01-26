/**
 * EXTINÇÃO RPG - COMBAT SYSTEM
 * Controla a Iniciativa customizada (Sucessos em d6) e regras da Horda.
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

            // --- REGRAS DE INICIATIVA (PÁGINA 36) ---
            
            let initValue = 0;
            const labelInit = "INICIATIVA"; // Ou use game.i18n.localize...

            // REGRA 1: A HORDA (Sempre Último / Zero)
            if (actor.type === 'horda') {
                initValue = 0;
                
                messages.push({
                    speaker: ChatMessage.getSpeaker({ actor: actor }),
                    content: `<div class="extincao-chat-card" style="border-left-color: #f44;">
                                <h3 style="color:#f44;">A HORDA AGUARDA...</h3>
                                <div style="text-align:center; font-size: 0.9em; color:#ccc;">
                                    Iniciativa 0 (Age por último)
                                </div>
                              </div>`
                });
            }
            
            // REGRA 2: SOBREVIVENTES E NPCs (Pool de Destreza)
            else {
                // Pega o valor de Destreza (mínimo 1 dado, Regra do Instinto)
                const des = actor.system.attributes?.des?.value || 0;
                const diceCount = Math.max(1, des);
                
                // Rola os dados (Ex: 3d6)
                const roll = await new Roll(`${diceCount}d6`).evaluate();
                
                // Exibe os dados 3D
                if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);

                // CONTA OS SUCESSOS (Quantos '6' saíram)
                const successes = roll.terms[0].results.filter(r => r.result === 6).length;

                // --- CRITÉRIO DE DESEMPATE (DECIMAL) ---
                // 1. Número de Sucessos (Inteiro)
                // 2. Valor do Atributo (Decimal) -> Quem tem maior DES age antes
                // 3. Jogador vs NPC -> Jogador ganha (+0.001)
                
                const tieBreakerAttr = des / 100; // Ex: Des 5 = 0.05
                const isPlayer = actor.hasPlayerOwner;
                const tieBreakerType = isPlayer ? 0.001 : 0;

                // Valor final (Ex: 1 Sucesso com Des 3 = 1.030)
                initValue = successes + tieBreakerAttr + tieBreakerType;

                // Monta a mensagem visual
                const diceHTML = roll.terms[0].results.map(r => 
                    `<span class="mini-die ${r.result===6?'crit':''}">${r.result}</span>`
                ).join("");

                messages.push({
                    speaker: ChatMessage.getSpeaker({ actor: actor }),
                    content: `<div class="extincao-chat-card" style="border-left-color: ${successes > 0 ? '#4da' : '#888'};">
                                <div style="border-bottom: 1px solid #444; margin-bottom:5px;">
                                    <strong>${labelInit}</strong>: ${actor.name}
                                </div>
                                <div style="font-size:0.8em; color:#888; text-align:center;">
                                    Destreza (${des}) <i class="fas fa-arrow-right"></i> Rolou ${diceCount}d6
                                </div>
                                <div class="dice-pool" style="justify-content:center; margin:10px 0;">${diceHTML}</div>
                                <div class="roll-result" style="text-align:center; font-size:1.4em; font-weight:bold; color: ${successes > 0 ? '#4da' : '#888'};">
                                    ${successes} SUCESSOS
                                </div>
                                <div style="text-align:center; font-size:0.6em; color:#555;">
                                    (Ordem: ${initValue.toFixed(3)})
                                </div>
                              </div>`
                });
            }

            // Adiciona à lista de atualizações
            updates.push({ _id: id, initiative: initValue });
        }

        // 3. Atualiza o Combat Tracker
        if (!updates.length) return this;
        await this.updateEmbeddedDocuments("Combatant", updates);

        // 4. Inicia o turno se necessário
        if (updateTurn) await this.update({ turn: 0 });

        // 5. Envia as mensagens
        if (messages.length > 0) {
            ChatMessage.implementation.create(messages);
        }

        return this;
    }
}