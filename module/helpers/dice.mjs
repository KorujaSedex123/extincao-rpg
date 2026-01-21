/**
 * MÓDULO DE ROLAGEM (DICE HELPER)
 * Responsável por gerenciar modais, regras de desespero e chat cards.
 */
export async function taskRoll(actor, dataset, item = null) {
    
    // 1. Definições Iniciais
    let baseDice = 0;
    // Tradução: "Rolagem"
    let label = dataset.label || game.i18n.localize("EXTINCAO.Roll.Label");
    let damageInfo = "";
    let isSpecialist = false;

    // Mapa de Atributos para Perícias
    const SKILL_MAP = {
      "briga": "for", "armas_brancas": "for", "atletismo": "for",
      "armas_fogo": "des", "furtividade": "des", "pilotagem": "des", "ladinagem": "des", "esquiva": "des",
      "vigor": "con",
      "medicina": "int", "tecnologia": "int", "investigacao": "int", "sobrevivencia": "int", "ciencias": "int",
      "percepcao": "per", "atencao": "per", "intuicao": "per",
      "lideranca": "von", "adestramento": "von", "intimidacao": "von", "diplomacia": "von"
    };

    // A. Lógica de Perícias
    if (dataset.rollType === 'skill') {
      const skillKey = dataset.key;
      const skill = actor.system.skills[skillKey];
      const attrKey = SKILL_MAP[skillKey] || "int";
      const attributeValue = actor.system.attributes[attrKey]?.value || 0;
      
      baseDice = attributeValue + skill.value;
      
      // Regra de Especialista
      if (skill.value >= 4) isSpecialist = true;
      
      label = `${label} (${attributeValue.toString().toUpperCase()} + ${skill.value})`;
    } 
    // B. Lógica de Atributos
    else if (dataset.key) {
      baseDice = actor.system.attributes[dataset.key]?.value || 0;
    } 
    // C. Lógica de Itens
    else if (dataset.rollType === 'item' && item) {
      baseDice = Number(item.system.bonus) || 1; 
      const damage = item.system.dano || "0";
      // Tradução: "Ataque: Nome"
      label = `${game.i18n.localize("EXTINCAO.Roll.Attack")}: ${item.name}`;
      damageInfo = damage;
    } 
    // D. Lógica de NPC
    else if (dataset.rollType === 'npc-attack') {
      baseDice = actor.system.attributes.attack.value || 1;
      damageInfo = actor.system.attributes.damage.value || "1";
    } else if (dataset.rollType === 'npc-defense') {
      baseDice = actor.system.attributes.defense.value || 1;
    }

    // 2. CONSTRUÇÃO DO MODAL (HTML com Traduções)
    const dialogContent = `
        <div style="background: #0e0e12; color: #eee; padding: 5px;">
            <div class="form-group flexrow" style="align-items: center; margin-bottom: 15px;">
                <label style="flex:1; font-weight:bold; color:#aaddff;">
                    <i class="fas fa-plus-minus"></i> ${game.i18n.localize("EXTINCAO.Roll.Modifier")}
                </label>
                <input type="number" name="modifier" value="0" style="flex:0 0 80px; background:#111; color:#fff; border:1px solid #444; text-align:center; font-size:1.2em; font-weight:bold;" autofocus/>
            </div>
            <div class="form-group" style="margin-bottom: 15px; border: 1px dashed #333; padding: 5px; border-radius: 4px;">
                <label class="checkbox" style="color:#ff5555; display:flex; align-items:center; gap:10px; cursor:pointer;">
                    <input type="checkbox" name="forceDesperation" style="width:16px; height:16px;"/> 
                    <span><i class="fas fa-exclamation-triangle"></i> ${game.i18n.localize("EXTINCAO.Roll.ForceDesperation")}</span>
                </label>
            </div>
            <div style="background:#000; padding:10px; border-radius:4px; font-size:0.9em; color:#888; text-align:center; border: 1px solid #222;">
                ${game.i18n.localize("EXTINCAO.Roll.BasePool")} <span style="color:#4eff8c; font-size:1.4em; font-weight:bold;">${baseDice}</span> ${game.i18n.localize("EXTINCAO.Roll.Dice")}
                ${isSpecialist ? `<div style="color:#4eff8c; font-weight:bold; margin-top:2px; font-size:0.8em;">${game.i18n.localize("EXTINCAO.Roll.SpecialistHint")}</div>` : ''}
            </div>
        </div>
    `;

    // 3. EXIBIÇÃO DO DIÁLOGO E EXECUÇÃO
    return new Promise((resolve) => {
        new Dialog({
            title: `Rolar: ${label}`,
            content: dialogContent,
            default: "roll",
            buttons: {
                roll: {
                    label: `<span style="font-weight:bold; color:#000;">ROLAR</span>`,
                    icon: '<i class="fas fa-dice-d6" style="color:#000;"></i>',
                    callback: async (html) => {
                        const modifier = Number(html.find('[name="modifier"]').val()) || 0;
                        const forceDesperation = html.find('[name="forceDesperation"]').is(':checked');
                        
                        let finalDiceCount = baseDice + modifier;
                        let isDesperate = false;
                        let glitchThreshold = 1; 

                        // Lógica de Desespero
                        if (finalDiceCount <= 0 || forceDesperation) {
                            if (finalDiceCount <= 0) finalDiceCount = 1;
                            isDesperate = true;
                            glitchThreshold = 3; 
                            // Tradução: "(DESESPERO)"
                            label += ` <span style='color:#f44; font-weight:bold;'>${game.i18n.localize("EXTINCAO.Roll.DesperationTag")}</span>`;
                        }

                        const targetNumber = isSpecialist ? 5 : 6;

                        // ROLAGEM DE DADOS
                        let roll = new Roll(`${finalDiceCount}d6`);
                        await roll.evaluate();

                        if (game.dice3d) { game.dice3d.showForRoll(roll, game.user, true); }

                        // ANÁLISE DOS RESULTADOS
                        const diceResults = roll.terms[0].results;
                        let successCount = 0;
                        let onesCount = 0;
                        let hasCrit = false;
                        let diceHTML = "";

                        for (let die of diceResults) {
                            const val = die.result;
                            let cssClass = "";
                            if (val === 6) { successCount++; hasCrit = true; cssClass = "crit"; } 
                            else if (val >= targetNumber) { successCount++; cssClass = "success"; } 
                            else if (val <= glitchThreshold) { onesCount++; cssClass = "glitch"; }
                            diceHTML += `<span class="mini-die ${cssClass}">${val}</span>`;
                        }

                        // MONTAGEM DO HTML DO CHAT
                        let outcomeHTML = "";
                        let borderSideColor = "#666";
                        let pushButton = "";

                        if (successCount > 0) {
                            // SUCESSO
                            borderSideColor = "#4eff8c";
                            if (actor.type === 'npc') borderSideColor = "#f44";
                            
                            // Tradução: "CRÍTICO!"
                            const critText = hasCrit ? `<div style="font-size:0.6em; color:#fff; letter-spacing:2px; border-top:1px dashed #444; margin-top:5px; padding-top:2px;">${game.i18n.localize("EXTINCAO.Roll.Critical")}</div>` : "";
                            
                            let damageHtml = "";
                            if (damageInfo && damageInfo !== "0") {
                                // Tradução: "DANO: valor"
                                damageHtml = `<div style="margin-top:5px; border-top:1px solid #333; padding-top:2px; font-weight:bold; color:${actor.type==='npc'?'#f44':'#ccc'}">${game.i18n.localize("EXTINCAO.Roll.Damage")}: ${damageInfo}</div>`;
                            }
                            
                            // Tradução: "SUCESSO(S)"
                            outcomeHTML = `<div class="roll-result success" style="${actor.type==='npc'?'color:#f44; border-color:#f44; background:#210;':''}"> ${successCount} ${game.i18n.localize("EXTINCAO.Roll.Success")} ${critText} </div> ${damageHtml}`;
                        } else {
                            // FALHA
                            if (onesCount > 0) {
                                borderSideColor = "#f44";
                                // Tradução: "DESASTRE!" ou "GLITCH!"
                                const glitchLabel = isDesperate ? game.i18n.localize("EXTINCAO.Roll.Disaster") : game.i18n.localize("EXTINCAO.Roll.Glitch");
                                // Tradução: "Situação agravada..."
                                outcomeHTML = `<div class="roll-result failure" style="color:#f44; border-color:#f44;">${glitchLabel}</div><div class="roll-summary glitch-text">${game.i18n.localize("EXTINCAO.Roll.Worsened")}</div>`;
                            } else {
                                // Tradução: "FALHA"
                                outcomeHTML = `<div class="roll-result failure">${game.i18n.localize("EXTINCAO.Roll.Failure")}</div>`;
                            }
                            
                            // Botão de Forçar (Macro Support)
                            if (actor.type === 'sobrevivente' && !isDesperate) {
                                const rollData = { actorId: actor.id, diceCount: finalDiceCount, targetNumber: targetNumber, label: label };
                                const dataString = JSON.stringify(rollData).replace(/"/g, '&quot;');
                                // Tradução: "FORÇAR (+1 Estresse)"
                                pushButton = `<div style="margin-top: 10px; text-align: center;"><button class="force-roll-btn" data-roll="${dataString}"><i class="fas fa-bolt"></i> ${game.i18n.localize("EXTINCAO.Roll.ForceBtn")}</button></div>`;
                            }
                        }

                        let specialistHint = isSpecialist ? `<div style="font-size:0.7em; color:#4eff8c; margin-bottom:5px;">${game.i18n.localize("EXTINCAO.Roll.SpecialistHint")}</div>` : "";
                        if (isDesperate) specialistHint += `<div style="font-size:0.7em; color:#f44; margin-bottom:5px; font-weight:bold;">${game.i18n.localize("EXTINCAO.Roll.DesperationHint")}</div>`;

                        ChatMessage.create({
                            speaker: ChatMessage.getSpeaker({ actor: actor }),
                            content: `<div class="extincao-roll" style="border-left-color: ${borderSideColor}"><h3>${label}</h3>${specialistHint}<div class="dice-pool">${diceHTML}</div>${outcomeHTML}${pushButton}</div>`
                        });
                        resolve(roll);
                    }
                }
            },
            close: () => resolve(null)
        }).render(true);
    });
}