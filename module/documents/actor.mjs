/**
 * Estende a classe Actor padrão do Foundry para implementar a lógica do EXTINÇÃO.
 */
export class ExtincaoActor extends Actor {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
  }

  /** @override */
  prepareDerivedData() {
    const actorData = this;
    const system = actorData.system;
    const flags = actorData.flags.extincao || {};

    // 1. Chamada Segura dos Preparadores (Evita erro de função não encontrada)
    if (actorData.type === 'sobrevivente') this._prepareCharacterData(actorData);
    if (actorData.type === 'npc' || actorData.type === 'inimigo') this._prepareNpcData(actorData);

    // 2. CÁLCULO AUTOMÁTICO DE RD (ARMADURA)
    // Soma a RD de todos os itens do tipo 'equipamento' que estão marcados como 'equipped'
    let totalRD = 0;

    if (this.items) {
      for (let item of this.items) {
        // Verifica se é equipamento e se tem RD
        if (item.type === 'equipamento' && item.system.rd > 0) {
          if (item.system.equipped) {
            totalRD += item.system.rd;
          }
        }
      }
    }

    // Salva o valor total em system.attributes.rd.value
    // Garante que a estrutura existe para não quebrar a ficha
    if (!system.attributes) system.attributes = {};
    if (!system.attributes.rd) system.attributes.rd = { value: 0 };
    
    system.attributes.rd.value = totalRD;
  }

  /**
   * Lógica de Cálculo para Sobreviventes (Regras Oficiais)
   */
  _prepareCharacterData(actorData) {
    const system = actorData.system;
    const attr = system.attributes;

    // 1. Coleta Atributos (Garante que são números)
    const con = Number(attr.con?.value || 0);
    const von = Number(attr.von?.value || 0);

    // ----------------------------------------------------
    // 2. CÁLCULO DE VIDA (PV)
    // Regra Pág. 60: (Constituição x 3) + 10
    // ----------------------------------------------------
    const pvMax = (con * 3) + 10;
    
    if (system.resources.pv) {
        system.resources.pv.max = pvMax;
        // Se for ficha nova (null), preenche o valor atual também
        if (system.resources.pv.value === null) system.resources.pv.value = pvMax;
    }

    // ----------------------------------------------------
    // 3. CÁLCULO DE RESISTÊNCIA (PR)
    // Regra Pág. 60: (Constituição + Vontade) x 5
    // ----------------------------------------------------
    const prMax = (con + von) * 5;

    if (system.resources.pr) {
        system.resources.pr.max = prMax;
        if (system.resources.pr.value === null) system.resources.pr.value = prMax;
    }
  }

  /**
   * Lógica Básica para NPCs (Evita erros de dados faltantes)
   */
  _prepareNpcData(actorData) {
    const system = actorData.system;
    // Garante que NPCs tenham o objeto de atributos para receber a RD
    if (!system.attributes) system.attributes = {};
    if (!system.attributes.rd) system.attributes.rd = { value: 0 };
  }
}