// Cria a constante do sistema
export const EXTINCAO = {};

/* -------------------------------------------- */
/* Definições de Arquétipos (Automação)       */
/* -------------------------------------------- */

// 1. Mapa de Atributos: Define quanto vale cada atributo ao selecionar
// Certifique-se que as chaves (for, des, con...) são iguais ao template.json
EXTINCAO.ARQUETIPOS_STATS = {
    "civil":      { for: 2, des: 2, con: 2, int: 2, per: 2, von: 2 },
    "soldado":    { for: 4, des: 3, con: 4, int: 2, per: 3, von: 3 },
    "medico":     { for: 2, des: 3, con: 3, int: 5, per: 4, von: 3 },
    "atleta":     { for: 4, des: 4, con: 4, int: 1, per: 3, von: 2 },
    "mecanico":   { for: 3, des: 3, con: 3, int: 4, per: 3, von: 2 },
    "policial":   { for: 3, des: 4, con: 3, int: 3, per: 4, von: 3 },
    "cientista":  { for: 1, des: 2, con: 2, int: 6, per: 4, von: 3 },
    "criminoso":  { for: 3, des: 5, con: 3, int: 3, per: 4, von: 2 },
    "sobrevivente": { for: 3, des: 3, con: 4, int: 2, per: 5, von: 4 }
};

// 2. Lista de Nomes: O que aparece escrito no menu Dropdown da ficha
EXTINCAO.ARQUETIPOS = {
    "civil": "Civil Comum",
    "soldado": "Militar/Ex-Militar",
    "medico": "Médico/Socorrista",
    "atleta": "Estrela Atleta",
    "mecanico": "Engenheiro/Mecânico",
    "policial": "Policial/Segurança",
    "cientista": "Cientista/Pesquisador",
    "criminoso": "Criminoso/Fugitivo",
    "sobrevivente": "Sobrevivente Nato"
};

// Opções de Uso/Dano para Armas
EXTINCAO.USO_ARMA = {
    "d4": "d4 (Leve/Improviso)",
    "d6": "d6 (Curta/Padrão)",
    "d8": "d8 (Média/Fuzil)",
    "d10": "d10 (Pesada/Escopeta)",
    "d12": "d12 (Brutal/Explosivo)"
};