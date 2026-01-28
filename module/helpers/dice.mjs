/**
 * MÓDULO DE ROLAGEM (DICE HELPER)
 * Responsável por gerenciar modais, regras de desespero e chat cards.
 */
export async function taskRoll(actor, dataset, item = null) {

    // 1. Configuração Inicial
    let baseDice = 0;
    let label = dataset.label || game.i18n.localize("EXTINCAO.Roll.Label");
    let isSpecialist = false;

    // --- PENALIDADES AUTOMÁTICAS ---
    let autoPenalty = 0;
    let penaltyReasons = [];

    // Infecção e Condições
    const infectionStage = Number(actor.system.details?.infection) || 0;
    if (infectionStage === 2) { autoPenalty -= 1; penaltyReasons.push("Febre (-1)"); }
    else if (infectionStage >= 3) { autoPenalty -= 2; penaltyReasons.push("Necrose (-2)"); }
    if (actor.system.conditions?.exausto) { autoPenalty -= 1; penaltyReasons.push("Exausto (-1)"); }

    // --- MAPA DE ATRIBUTOS ---
    const SKILL_MAP = {
        "briga": "for", "armas_brancas": "for", "atletismo": "for",
        "armas_fogo": "des", "furtividade": "des", "pilotagem": "des", "ladinagem": "des", "esquiva": "des",
        "vigor": "con", "medicina": "int", "tecnologia": "int", "investigacao": "int",
        "sobrevivencia": "int", "ciencias": "int", "percepcao": "per", "atencao": "per",
        "intuicao": "per", "lideranca": "von", "adestramento": "von", "intimidacao": "von", "diplomacia": "von"
    };

    // --- DECIDE QUANTOS DADOS ROLAR ---

    // A. Perícia (Sobrevivente)
    if (dataset.rollType === 'skill') {
        const skillKey = dataset.key;
        const skill = actor.system.skills ? actor.system.skills[skillKey] : { value: 0 };
        const attrKey = SKILL_MAP[skillKey] || "int";
        const attributeValue = actor.system.attributes?.[attrKey]?.value || 0;

        baseDice = attributeValue + (skill.value || 0);
        if (skill.value >= 4) isSpecialist = true;
        label += ` <span style="font-size:0.7em; color:#888;">(${attrKey.toUpperCase()} + ${skill.label || skillKey})</span>`;
    }
    // B. Atributo Puro
    else if (dataset.key) {
        baseDice = actor.system.attributes?.[dataset.key]?.value || 0;
    }
    // C. Valor Estático (NPCs)
    else if (dataset.rollType === 'static') {
        baseDice = Number(dataset.dice) || 0;
    }

    // --- DANO (Do Item ou do Botão) ---
    let weaponDamage = 0;

    // Se veio um Item real
    if (item && item.system.dano) {
        weaponDamage = Number(item.system.dano) || 0;
        if (item.system.bonus) baseDice += Number(item.system.bonus);
    }
    // Se veio direto no dataset (NPC Simples)
    else if (dataset.damage) {
        weaponDamage = Number(dataset.damage) || 0;
    }

    // 2. DIÁLOGO DE ROLAGEM
    const dialogContent = `
        <div style="background: #0e0e12; color: #eee; padding: 5px;">
            ${penaltyReasons.length > 0 ? `<div style="font-size: 0.8em; color: #ff5555; margin-bottom: 5px; text-align: center;"><i class="fas fa-biohazard"></i> ${penaltyReasons.join(", ")}</div>` : ""}
            <div class="form-group flexrow" style="align-items: center; margin-bottom: 15px;">
                <label style="flex:1; font-weight:bold; color:#aaddff;"><i class="fas fa-plus-minus"></i> Modificador</label>
                <input type="number" name="modifier" value="${autoPenalty}" style="flex:0 0 80px; background:#111; color:#fff; border:1px solid #444; text-align:center; font-size:1.2em; font-weight:bold;" autofocus/>
            </div>
            <div class="form-group" style="margin-bottom: 15px; border: 1px dashed #333; padding: 5px; border-radius: 4px;">
                <label class="checkbox" style="color:#ff5555; display:flex; align-items:center; gap:10px; cursor:pointer;">
                    <input type="checkbox" name="forceDesperation" style="width:16px; height:16px;"/> 
                    <span><i class="fas fa-exclamation-triangle"></i> Desespero (Glitch no 1, 2, 3)</span>
                </label>
            </div>
            <div style="background:#000; padding:10px; border-radius:4px; font-size:0.9em; color:#888; text-align:center; border: 1px solid #222;">
                Parada de Dados: <span style="color:#4eff8c; font-size:1.4em; font-weight:bold;">${baseDice}</span>
                ${weaponDamage > 0 ? `<br>Dano Potencial: <span style="color:#f44;">${weaponDamage}</span>` : ''}
            </div>
        </div>
    `;

    return new Promise((resolve) => {
        new Dialog({
            title: label,
            content: dialogContent,
            default: "roll",
            buttons: {
                roll: {
                    label: `<span style="font-weight:bold; color:#000;">ATACAR / ROLAR</span>`,
                    icon: '<i class="fas fa-dice-d6" style="color:#000;"></i>',
                    callback: async (html) => {
                        const modifier = Number(html.find('[name="modifier"]').val()) || 0;
                        const forceDesperation = html.find('[name="forceDesperation"]').is(':checked');

                        let finalDiceCount = Math.max(1, baseDice + modifier);
                        if (finalDiceCount <= 0 && !forceDesperation) finalDiceCount = 1;

                        // ROLAGEM
                        let roll = new Roll(`${finalDiceCount}d6`);
                        await roll.evaluate();
                        if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);

                        const targetNumber = isSpecialist ? 5 : 6;
                        const diceResults = roll.terms[0].results;
                        let successCount = 0;
                        let onesCount = 0;
                        let diceHTML = "";
                        let glitchThreshold = forceDesperation ? 3 : 1;
                        if (baseDice + modifier <= 0) glitchThreshold = 3;

                        for (let die of diceResults) {
                            const val = die.result;
                            let cssClass = "";
                            if (val === 6) { successCount++; cssClass = "crit"; }
                            else if (val >= targetNumber) { successCount++; cssClass = "success"; }
                            else if (val <= glitchThreshold) { onesCount++; cssClass = "glitch"; }
                            diceHTML += `<span class="mini-die ${cssClass}">${val}</span>`;
                        }

                        // ====================================================
                        // AUTOMAÇÃO DE COMBATE (TARGETING)
                        // ====================================================
                        const targets = Array.from(game.user.targets);
                        let combatResultHTML = "";

                        if (targets.length > 0) {
                            const target = targets[0].actor;
                            const npcType = target.system.details?.type || "infectado";
                            const isHumano = ["civil", "militar"].includes(npcType);

                            let defenseVal = 0;
                            let hit = false;
                            let defDetails = "";

                            // Defesa Automática
                            if (target.type === 'npc' && isHumano) {
                                const defPool = target.system.attributes?.defense?.value || 0;
                                const defRoll = await new Roll(`${defPool}d6`).evaluate();

                                const gmIds = game.users.filter(u => u.isGM).map(u => u.id);
                                if (gmIds.length > 0) {
                                    defRoll.toMessage({
                                        speaker: ChatMessage.getSpeaker({ actor: target }),
                                        flavor: `<span style="color:#aaddff; font-weight:bold;">🛡️ Defesa de ${target.name}</span>`,
                                        whisper: gmIds
                                    });
                                }

                                const defSuccesses = defRoll.terms[0].results.filter(r => r.result >= 6).length;
                                defenseVal = defSuccesses;
                                defDetails = `Defesa: ${defSuccesses}`;
                                hit = successCount > defenseVal;
                            } else {
                                defenseVal = target.system.attributes?.defense?.value || 0;
                                defDetails = `Dificuldade: ${defenseVal}`;
                                hit = successCount >= defenseVal;
                            }

                            // RESULTADO E DANO
                            if (hit) {
                                let damageMsg = "";
                                if (weaponDamage > 0) {
                                    const rd = Number(target.system.attributes?.rd?.value) || 0;
                                    const finalDamage = Math.max(0, weaponDamage - rd);

                                    // APLICA DANO AUTOMÁTICO
                                    if (game.user.isGM || target.isOwner) {
                                        const currentPV = target.system.resources.pv.value;
                                        const newPV = Math.max(0, currentPV - finalDamage);
                                        await target.update({ "system.resources.pv.value": newPV });

                                        damageMsg = `<br><span style="color:#fff; font-weight:bold; background:#500; padding:2px 5px; border-radius:3px; font-size:0.9em;">
                                            💥 ${finalDamage} DANO APLICADO
                                        </span>`;
                                        if (rd > 0) damageMsg += ` <span style="font-size:0.7em; color:#aaa;">(RD ${rd})</span>`;
                                    } else {
                                        damageMsg = `<button class="apply-damage-btn" data-damage="${weaponDamage}" data-target-id="${targets[0].id}"><i class="fas fa-tint"></i> APLICAR DANO (${weaponDamage})</button>`;
                                    }
                                }

                                combatResultHTML = `
                                    <div style="margin-top:10px; padding:8px; background:rgba(78, 255, 140, 0.1); border:1px solid #4eff8c; color:#4eff8c; text-align:center;">
                                        <div style="font-weight:bold; font-size:1.1em;">ACERTOU!</div>
                                        <div style="font-size:0.8em; color:#aaa;">(${successCount} vs ${defDetails})</div>
                                        ${damageMsg}
                                    </div>`;
                            } else {
                                combatResultHTML = `
                                    <div style="margin-top:10px; padding:5px; background:rgba(255, 68, 68, 0.1); border:1px solid #f44; color:#f44; text-align:center; font-weight:bold;">
                                        BLOQUEADO / ERROU <br>
                                        <span style="font-size:0.8em; color:#aaa;">(${successCount} vs ${defDetails})</span>
                                    </div>`;
                            }
                        }

                        // RESULTADO FINAL
                        let outcomeHTML = "";
                        let borderSideColor = "#666";

                        if (successCount > 0) {
                            borderSideColor = "#4eff8c";
                            outcomeHTML = `<div class="roll-result success">${successCount} SUCESSOS</div>`;
                        } else {
                            if (onesCount > 0) {
                                borderSideColor = "#f44";
                                outcomeHTML = `<div class="roll-result failure glitch">GLITCH / DESASTRE</div>`;
                            } else {
                                outcomeHTML = `<div class="roll-result failure">FALHA</div>`;
                            }
                        }

                        ChatMessage.create({
                            speaker: ChatMessage.getSpeaker({ actor: actor }),
                            content: `
                            <div class="extincao-roll" style="border-left-color: ${borderSideColor}">
                                <h3>${label}</h3>
                                <div class="dice-pool">${diceHTML}</div>
                                ${outcomeHTML}
                                ${combatResultHTML}
                            </div>`,
                            rolls: [roll],
                        });
                        resolve(roll);
                    }
                }
            },
            close: () => resolve(null)
        }).render(true);
    });
}
/**
 * Rola o Dado de Ruído (Noise Die) conforme as regras oficiais (Pág 14).
 * 1-3: Seguro / 4-5: Atenção / 6: O Eco
 */
export async function rollNoise() {
    // 1. Rola o Dado Preto
    const roll = new Roll("1d6");
    await roll.evaluate();

    if (game.dice3d) {
        // Força o dado a ser preto para combinar com a regra
        game.dice3d.showForRoll(roll, game.user, true);
    }

    const result = roll.total;
    let status = "";
    let statusText = "";
    let flavorText = "";
    let icon = "";
    let sound = null;

    // 2. Verifica a Tabela (Pág 14 PDF)
    if (result <= 3) {
        // 1, 2, 3 -> SILÊNCIO
        status = "safe";
        statusText = "SILÊNCIO";
        flavorText = "O som foi abafado. Ninguém ouviu.";
        icon = "fa-volume-mute";
    }
    else if (result <= 5) {
        // 4, 5 -> ATENÇÃO (+1 Inimigo)
        status = "warning";
        statusText = "ATENÇÃO!";
        flavorText = "Um zumbi próximo ouviu... <br><strong>(+1 INIMIGO NA CENA)</strong>";
        icon = "fa-exclamation-triangle";
        sound = "sounds/notify.wav"; // Som de alerta leve
    }
    else {
        // 6 -> O ECO (Horda/Onda de Ataque)
        status = "danger";
        statusText = "O E C O";
        flavorText = "O som viajou longe. A Horda despertou!<br><strong>(AUMENTE O ALERTA)</strong>";
        icon = "fa-biohazard";
        sound = "sounds/combat.wav"; // Som de perigo grave (se tiver)
    }

    // 3. Monta o Card Visual
    const barsHtml = `
        <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
    `;

    const content = `
    <div class="noise-card ${status}">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px; margin-bottom:10px;">
            <span style="font-size:0.8em; opacity:0.7;">MONITOR DE RUÍDO</span>
            <i class="fas ${icon}" style="font-size:1.2em;"></i>
        </div>
        
        <div class="sound-wave">
            ${barsHtml}
        </div>

        <div class="noise-result">
            ${statusText}
        </div>
        
        <div style="font-size: 2.5em; font-weight:bold; margin: 5px 0; opacity: 0.9;">
            [ ${result} ]
        </div>
        
        <div style="font-size: 0.85em; margin-top: 10px; line-height: 1.4; padding: 5px; background: rgba(0,0,0,0.3); border-radius: 4px;">
            ${flavorText}
        </div>
    </div>
    `;

    // 4. Envia ao Chat
    ChatMessage.create({
        user: game.user.id,
        content: content,
        sound: sound,
        rolls: [roll]
    });
}