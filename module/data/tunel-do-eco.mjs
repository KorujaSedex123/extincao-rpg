export const TUNEL_DO_ECO_DATA = {
    folderName: "O Túnel do Eco",

    // --- 1. O ARSENAL (ITENS SOLTOS) ---
    // Estes itens serão criados na pasta de Item para você arrastar para os jogadores
    items: [
        // ARMAS DE FOGO
        { name: "Fuzil de Assalto Tático", type: "arma", img: "icons/weapons/guns/rifle-assault-tan.webp", system: { dano: 5, uso: "d8", description: "<p><b>Dano 5 | Barulhento</b><br>Militar. Preciso e letal.</p>" } },
        { name: "Pistola 9mm Compacta", type: "arma", img: "icons/weapons/guns/gun-pistol-silenced.webp", system: { dano: 3, uso: "d6", description: "<p><b>Dano 3</b><br>Discreta e confiável.</p>" } },
        { name: "Escopeta Cano Serrado", type: "arma", img: "icons/weapons/guns/shotgun-double-barrel-sawed-off.webp", system: { dano: 5, uso: "d4", description: "<p><b>Dano 5 | Curto Alcance</b><br>Devastadora de perto, inútil de longe.</p>" } },
        { name: "Rifle de Caça com Mira", type: "arma", img: "icons/weapons/guns/rifle-sniper.webp", system: { dano: 5, uso: "d6", description: "<p><b>Dano 5 | Perfurante</b><br>Ignora armaduras. Bônus em tiro longo.</p>" } },
        { name: "Revólver .38", type: "arma", img: "icons/weapons/guns/revolver-snub-brown.webp", system: { dano: 2, uso: "d6", description: "<p><b>Dano 2 | Confiável</b><br>Nunca trava em Glitch.</p>" } },
        
        // ARMAS BRANCAS / FERRAMENTAS
        { name: "Faca de Combate", type: "arma", img: "icons/weapons/daggers/dager-bound-black.webp", system: { dano: 2, uso: "0", description: "<p><b>Dano 2 | Silenciosa</b><br>Pode ser usada em <i>Stealth Kill</i>.</p>" } },
        { name: "Marreta de Demolição", type: "arma", img: "icons/weapons/hammers/hammer-sledge-heavy.webp", system: { dano: 4, uso: "0", description: "<p><b>Dano 4 | Pesada</b><br>Destrói portas e barricadas (Bônus em Força).</p>" } },
        { name: "Machado de Incêndio", type: "arma", img: "icons/weapons/axes/axe-fireman-red.webp", system: { dano: 4, uso: "0", description: "<p><b>Dano 4 | Brutal</b><br>Causa sangramento massivo.</p>" } },
        { name: "Pé de Cabra", type: "arma", img: "icons/weapons/maces/mace-simple-hook.webp", system: { dano: 3, uso: "0", description: "<p><b>Dano 3 | Utilidade</b><br>+1d6 para arrombar caixas e portas.</p>" } },
        { name: "Taco de Beisebol", type: "arma", img: "icons/weapons/clubs/club-baseball-bat-wood.webp", system: { dano: 3, uso: "0", description: "<p><b>Dano 3</b><br>Clássico e durável.</p>" } },
        { name: "Estilingue Profissional", type: "arma", img: "icons/weapons/slings/sling-leather-brown.webp", system: { dano: 2, uso: "0", description: "<p><b>Dano 2 | Silencioso</b><br>Munição infinita (pedras/sucata).</p>" } },
        { name: "Machado de Mão", type: "arma", img: "icons/weapons/axes/axe-broad-wood.webp", system: { dano: 4, uso: "0", description: "<p><b>Dano 4</b><br>Rápido e brutal.</p>" } },
        { name: "Bastão de Alumínio", type: "arma", img: "icons/weapons/clubs/club-metal-shiny.webp", system: { dano: 3, uso: "0", description: "<p><b>Dano 3</b><br>Leve e rápido.</p>" } },
        { name: "Canivete", type: "arma", img: "icons/weapons/daggers/dagger-simple-brown.webp", system: { dano: 2, uso: "0", description: "<p><b>Dano 2 | Oculto</b><br>Fácil de esconder.</p>" } },
        
        // EQUIPAMENTOS E VESTUÁRIO
        { name: "Colete Kevlar (RD 2)", type: "item", img: "icons/equipment/chest/vest-leather-brown.webp", system: { quantity: 1, description: "<p><b>Proteção: 2</b><br>Um colete policial surrado. Protege o tronco contra balas e mordidas.</p>" } },
        { name: "Traje de Aproximação (RD 3)", type: "item", img: "icons/equipment/chest/breastplate-layered-leather-black.webp", system: { quantity: 1, description: "<p><b>Proteção: 3 | Pesado</b><br>Traje de bombeiro. Protege contra fogo e mordidas, mas dá -1d6 em Furtividade.</p>" } },
        { name: "Roupa Reforçada (RD 2)", type: "item", img: "icons/equipment/chest/shirt-flannel-orange.webp", system: { quantity: 1, description: "<p><b>Proteção: 2</b><br>Jaqueta grossa com revistas e couro enrolados nos braços.</p>" } },
        { name: "Camuflagem (RD 1)", type: "item", img: "icons/equipment/chest/cloak-hooded-green.webp", system: { quantity: 1, description: "<p><b>Proteção: 1</b><br>Roupa de caça.</p>" } },
        
        // CONSUMÍVEIS / UTILITÁRIOS
        { name: "Kit Médico Completo", type: "item", img: "icons/tools/tinker/first-aid-kit-red.webp", system: { quantity: 3, description: "<p><b>Uso:</b> Recupera PV e estanca sangramento. Exige teste de Medicina.</p>" } },
        { name: "Kit Médico Básico", type: "item", img: "icons/tools/tinker/first-aid-kit-green.webp", system: { quantity: 1, description: "<p><b>Uso:</b> 1 Uso apenas.</p>" } },
        { name: "Analgésicos", type: "item", img: "icons/consumables/health/pill-bottle-white.webp", system: { quantity: 1, description: "<p><b>Uso:</b> Remove 1 Ponto de Estresse ou ignora dor temporariamente.</p>" } },
        { name: "Caixa de Ferramentas", type: "item", img: "icons/tools/hand/wrench-monkey-grey.webp", system: { quantity: 1, description: "<p>Permite testes de Mecânica sem penalidade. Pode consertar armas e veículos.</p>" } },
        { name: "Kit de Lockpick", type: "item", img: "icons/tools/hand/lockpicks-steel.webp", system: { quantity: 1, description: "<p>Ferramentas finas para abrir fechaduras silenciosamente.</p>" } },
        { name: "Bíblia", type: "item", img: "icons/sundry/books/book-symbol-cross-gold-brown.webp", system: { quantity: 1, description: "<p><b>Âncora:</b> Ler ou pregar recupera Estresse do personagem ou aliados.</p>" } },
        { name: "Binóculos", type: "item", img: "icons/tools/navigation/binoculars-grey.webp", system: { quantity: 1, description: "<p>+1d6 em Percepção visual a longa distância.</p>" } },
        { name: "Lanterna de Cabeça", type: "item", img: "icons/equipment/head/goggles-leather-black.webp", system: { quantity: 1, description: "<p>Anula penalidade de escuridão mantendo as mãos livres.</p>" } },
        { name: "Sinalizador (Flare)", type: "item", img: "icons/weapons/ammunition/explosive-dynamite.webp", system: { quantity: 1, description: "<p>Distração luminosa.</p>" } },
        { name: "Mochila Grande", type: "item", img: "icons/containers/bags/pack-leather-white.webp", system: { quantity: 1, description: "<p>Carrega mais itens sem penalidade.</p>" } }
    ],

    // --- 2. SOBREVIVENTES (PELADOS - Sem Itens) ---
    survivors: [
        {
            name: "Elias 'Sargento'",
            img: "icons/svg/mystery-man.svg",
            system: {
                attributes: { for: {value:3}, des: {value:4}, con: {value:3}, int: {value:2}, per: {value:2}, von: {value:1} },
                skills: { armas_fogo: {value:4}, briga: {value:3}, atletismo: {value:2}, sobrevivencia: {value:2} },
                resources: { pv: {value:19, max:19}, pr: {value:20, max:20}, estresse: {value:0} },
                details: { archetype: "O Combatente", biography: "<p>Ex-sargento buscando redenção. Viu seu esquadrão morrer aqui.</p>", qualidades: "<p><b>Mãos Firmes:</b> +2d6 ao mirar.</p>", defeitos: "<p><b>Insônia:</b> Recupera metade do PR.</p>" }
            }
        },
        {
            name: "Paredão",
            img: "icons/svg/mystery-man.svg",
            system: {
                attributes: { for: {value:5}, des: {value:1}, con: {value:4}, int: {value:1}, per: {value:2}, von: {value:2} },
                skills: { briga: {value:5}, armas_brancas: {value:3}, atletismo: {value:4} },
                resources: { pv: {value:22, max:22}, pr: {value:30, max:30}, estresse: {value:0} },
                details: { archetype: "O Civil (Força Bruta)", biography: "<p>Estivador gigante. Abre o caminho na força.</p>", qualidades: "<p><b>Adrenalina da Dor:</b> +2d6 ataque com <50% PV.</p>", defeitos: "<p><b>Manco:</b> -2d6 Fuga/Movimento.</p>" }
            }
        },
        {
            name: "Dra. Sofia",
            img: "icons/svg/mystery-man.svg",
            system: {
                attributes: { for: {value:1}, des: {value:2}, con: {value:2}, int: {value:5}, per: {value:3}, von: {value:2} },
                skills: { medicina: {value:4}, primeiros_socorros: {value:4}, atencao: {value:3}, social: {value:2} },
                resources: { pv: {value:16, max:16}, pr: {value:20, max:20}, estresse: {value:0} },
                details: { archetype: "A Médica", biography: "<p>Cirurgiã de trauma. Focada em manter o grupo vivo.</p>", qualidades: "<p><b>Mãos Firmes:</b> Cirurgia.</p>", defeitos: "<p><b>Pacifista:</b> -2d6 ataque contra humanos.</p>" }
            }
        },
        {
            name: "Beto 'Faísca'",
            img: "icons/svg/mystery-man.svg",
            system: {
                attributes: { for: {value:2}, des: {value:2}, con: {value:3}, int: {value:4}, per: {value:3}, von: {value:2} },
                skills: { mecanica: {value:4}, eletronica: {value:3}, armas_brancas: {value:2}, pilotagem: {value:2} },
                resources: { pv: {value:19, max:19}, pr: {value:25, max:25}, estresse: {value:0} },
                details: { archetype: "O Técnico", biography: "<p>Mecânico do metrô. Rei da gambiarra.</p>", qualidades: "<p><b>Gambiarra:</b> +2d6 criar itens.</p>", defeitos: "<p><b>Vício:</b> Cigarro (-2d6 sem fumar).</p>" }
            }
        },
        {
            name: "Renata 'Anjo'",
            img: "icons/svg/mystery-man.svg",
            system: {
                attributes: { for: {value:4}, des: {value:2}, con: {value:4}, int: {value:2}, per: {value:2}, von: {value:2} },
                skills: { armas_brancas: {value:4}, atletismo: {value:3}, primeiros_socorros: {value:2}, sobrevivencia: {value:2} },
                resources: { pv: {value:22, max:22}, pr: {value:30, max:30}, estresse: {value:0} },
                details: { archetype: "O Combatente", biography: "<p>Bombeira civil. Conhece o túnel.</p>", qualidades: "<p><b>Porte Atlético:</b> Carrega aliados.</p>", defeitos: "<p><b>Equipamento Pesado:</b> -1d6 Iniciativa.</p>" }
            }
        },
        {
            name: "Padre Miguel",
            img: "icons/svg/mystery-man.svg",
            system: {
                attributes: { for: {value:2}, des: {value:2}, con: {value:2}, int: {value:3}, per: {value:2}, von: {value:4} },
                skills: { social: {value:5}, primeiros_socorros: {value:2}, armas_brancas: {value:2} },
                resources: { pv: {value:16, max:16}, pr: {value:30, max:30}, estresse: {value:0} },
                details: { archetype: "O Líder Espiritual", biography: "<p>A fé é o único escudo. Pilar moral.</p>", qualidades: "<p><b>Líder Nato:</b> Comanda aliados.</p>", defeitos: "<p><b>Mártir:</b> Estresse se não salvar outros.</p>" }
            }
        },
        {
            name: "Leo 'Sombra'",
            img: "icons/svg/mystery-man.svg",
            system: {
                attributes: { for: {value:2}, des: {value:5}, con: {value:2}, int: {value:2}, per: {value:3}, von: {value:1} },
                skills: { furtividade: {value:4}, esquiva: {value:3}, atletismo: {value:3}, armas_brancas: {value:2} },
                resources: { pv: {value:16, max:16}, pr: {value:15, max:15}, estresse: {value:0} },
                details: { archetype: "O Marginal", biography: "<p>Entregador do submundo. Parkour e invasão.</p>", qualidades: "<p><b>Ligeiro:</b> +2d6 Iniciativa/Fuga.</p>", defeitos: "<p><b>Arrogante:</b> -2d6 Social.</p>" }
            }
        },
        {
            name: "Júlia 'Corredora'",
            img: "icons/svg/mystery-man.svg",
            system: {
                attributes: { for: {value:2}, des: {value:5}, con: {value:3}, int: {value:2}, per: {value:2}, von: {value:1} },
                skills: { atletismo: {value:5}, esquiva: {value:4}, armas_brancas: {value:3}, furtividade: {value:2} },
                resources: { pv: {value:19, max:19}, pr: {value:20, max:20}, estresse: {value:0} },
                details: { archetype: "A Atleta", biography: "<p>Maratonista. Bater e correr.</p>", qualidades: "<p><b>Ligeiro:</b> +2d6 Fuga.</p>", defeitos: "<p><b>Metabolismo:</b> Fome rápida.</p>" }
            }
        },
        {
            name: "Sr. Cláudio",
            img: "icons/svg/mystery-man.svg",
            system: {
                attributes: { for: {value:1}, des: {value:4}, con: {value:2}, int: {value:2}, per: {value:4}, von: {value:2} },
                skills: { armas_fogo: {value:5}, atencao: {value:4}, sobrevivencia: {value:3}, mecanica: {value:2} },
                resources: { pv: {value:16, max:16}, pr: {value:20, max:20}, estresse: {value:0} },
                details: { archetype: "O Sniper", biography: "<p>Caçador aposentado. Paciente e preciso.</p>", qualidades: "<p><b>Sexto Sentido:</b> Avisa emboscadas.</p>", defeitos: "<p><b>Míope:</b> Precisa de óculos.</p>" }
            }
        },
        {
            name: "Lucas 'Formiga'",
            img: "icons/svg/mystery-man.svg",
            system: {
                attributes: { for: {value:1}, des: {value:5}, con: {value:2}, int: {value:3}, per: {value:4}, von: {value:3} },
                skills: { furtividade: {value:5}, atencao: {value:4}, atletismo: {value:3} },
                resources: { pv: {value:16, max:16}, pr: {value:25, max:25}, estresse: {value:0} },
                details: { archetype: "O Mascote", biography: "<p>Criança que vive nos dutos. Pequeno e silencioso.</p>", qualidades: "<p><b>Pequeno Alvo:</b> +2d6 Esquiva tiros.</p>", defeitos: "<p><b>Frágil:</b> Sem armas pesadas.</p>" }
            }
        }
    ],

    // --- 3. INIMIGOS E DIÁRIOS ---
    journals: [
        { name: "00. Premissa e Regras", content: `<h2>O Túnel do Eco</h2><p><i>"O mundo não acabou com um estrondo. Ele acabou com um grito."</i></p><hr><h3>O Cenário</h3><p>Rota de fuga única: <b>Túnel Rebouças</b>. 3km de escuridão.</p><h3>Regras</h3><ul><li><b>Silêncio:</b> Dado do Ruído (d6 preto). Se bater 6, Horda desperta.</li><li><b>Escuridão:</b> Sem luz, testes -3d6.</li></ul>` },
        { name: "01. Ato 1: O Cemitério", content: `<h3>Desafios</h3><p><b>Labirinto de Metal:</b> Teste Destreza + Furtividade (Dif 1).</p><p><b>Scavenging:</b> Teste Percepção + Atenção.</p>` },
        { name: "02. Ato 2: O Bloqueio", content: `<h3>Inimigos: Blindados</h3><p>3 Ex-policiais (Defesa 2, Coletes). Derrubar ajuda.</p><h3>Puzzle</h3><p>Ligar Gerador (+2 Ruído) ou Hackear Terminal.</p>` },
        { name: "04. Clímax: Corrida", content: `<h3>A Fuga</h3><p>Modo Perseguição. Água na cintura, Horda atrás, Portão trancado.</p>` }
    ],
    enemies: [
        { name: "Caminhante (Comum)", type: "npc", img: "icons/svg/mystery-man.svg", system: { resources: { pv: { value: 4, max: 4 } }, attributes: { defesa: { value: 1 }, ataque: { value: 3 }, dano: { value: 2 }, nivel: { value: 1 } }, details: { tipo: "infectado", biography: "<p>Lento, carne podre.</p>" } } },
        { name: "Blindado (Policial)", type: "npc", img: "icons/svg/mystery-man.svg", system: { resources: { pv: { value: 8, max: 8 } }, attributes: { defesa: { value: 2 }, ataque: { value: 4 }, dano: { value: 3 }, nivel: { value: 2 } }, details: { tipo: "infectado", biography: "<p>Ex-policial de choque. Imune a tiros no peito.</p>" } } },
        { name: "A Horda (Túnel)", type: "horda", img: "icons/svg/biohazard.svg", system: { resources: { alerta: { value: 1, max: 6 } }, details: { densidade: "multidao", biography: "<p>Parede de carne.</p>" } } }
    ]
};