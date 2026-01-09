/**
 * Estende a classe Actor padrão do Foundry para implementar a lógica do EXTINÇÃO.
 */
export class ExtincaoActor extends Actor {

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

  /** @override */
  prepareDerivedData() {
    const actorData = this;
    const system = actorData.system;
    const flags = actorData.flags;

    super.prepareDerivedData();

    // Lógica específica para Sobreviventes
    if (actorData.type === 'sobrevivente') {
      this._prepareSobreviventeData(actorData);
    }
  }

  /**
   * CALCULA VIDA E RESISTÊNCIA AUTOMATICAMENTE
   */
  _prepareSobreviventeData(actorData) {
    const system = actorData.system;
    const attributes = system.attributes;

    // 1. Garante que os atributos sejam números (evita erro de texto)
    const con = Number(attributes.con.value) || 0;
    const von = Number(attributes.von.value) || 0; // Adicionei Vontade
    const forca = Number(attributes.for.value) || 0;
    const des = Number(attributes.des.value) || 0;

    // 2. FÓRMULA DE VIDA (PV) = (Constituição x 3) + 10
    system.resources.pv.max = (con * 3) + 10;

    // 3. FÓRMULA DE RESISTÊNCIA (PR) = (Constituição + Vontade) * 5
    // CORRIGIDO: Agora usa CON + VON
    system.resources.pr.max = (con + von) * 5;
    
    // 4. Inicialização (Se for ficha nova/zerada, enche a barra)
    if (system.resources.pv.value === null) system.resources.pv.value = system.resources.pv.max;
    if (system.resources.pr.value === null) system.resources.pr.value = system.resources.pr.max;
  }
}