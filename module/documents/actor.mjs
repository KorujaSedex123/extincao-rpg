/**
 * Estende a classe Actor padrão do Foundry para implementar a lógica do EXTINÇÃO.
 */
export class BoilerplateActor extends Actor {

  /** @override */
  prepareData() {
    // Prepara dados básicos (Atributos, etc)
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Dados que não dependem de itens ou efeitos
    super.prepareBaseData();
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data.
   */
  prepareDerivedData() {
    const actorData = this;
    const system = actorData.system;
    const flags = actorData.flags.extincao || {};

    // Garante que só executa para personagens jogadores (Sobreviventes)
    if (actorData.type === 'sobrevivente') {
      this._prepareSobreviventeData(actorData);
    }

    // Se tiver lógica para NPC/Horda, chame aqui
    // if (actorData.type === 'npc') this._prepareNpcData(actorData);
  }

  /**
   * Lógica de Cálculo Automático para Sobreviventes
   * Fórmula Unificada e Corrigida
   */
  _prepareSobreviventeData(actorData) {
    const system = actorData.system;
    const attr = system.attributes;

    // 1. GARANTIR QUE SÃO NÚMEROS (Conversão segura)
    const forca = Number(attr.for?.value || 0);
    const des   = Number(attr.des?.value || 0);
    const con   = Number(attr.con?.value || 0);
    const int   = Number(attr.int?.value || 0);
    const per   = Number(attr.per?.value || 0);
    const von   = Number(attr.von?.value || 0);

    // ----------------------------------------------------
    // 2. CÁLCULO DE VIDA (PV)
    // Fórmula: (Força + Constituição) * 5 + 10
    // ----------------------------------------------------
    const pvMax = (forca + con) * 5 + 10;
    
    // Atualiza o Máximo
    system.resources.pv.max = pvMax;

    // Se o valor atual for nulo/indefinido (ficha nova), preenche com o máximo
    if (system.resources.pv.value === null || system.resources.pv.value === undefined) {
      system.resources.pv.value = pvMax;
    }

    // ----------------------------------------------------
    // 3. CÁLCULO DE RESISTÊNCIA (PR)
    // Fórmula: (Força + Constituição + Vontade) * 4 + 5
    // ----------------------------------------------------
    const prMax = (forca + con + von) * 4 + 5;
    
    // Atualiza o Máximo
    system.resources.pr.max = prMax;

    // Se o valor atual for nulo/indefinido (ficha nova), preenche com o máximo
    if (system.resources.pr.value === null || system.resources.pr.value === undefined) {
      system.resources.pr.value = prMax;
    }

    // ----------------------------------------------------
    // 4. CÁLCULO DE ESSÊNCIA (Opcional)
    // Fórmula: Soma de todos os atributos primários
    // ----------------------------------------------------
    const essenciaMax = forca + des + con + int + per + von;
    if (!system.resources.essencia) system.resources.essencia = {};
    system.resources.essencia.max = essenciaMax;
  }
}