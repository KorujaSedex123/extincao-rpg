/**
 * Módulo de Configurações do Sistema (Settings)
 */
export function registerSettings() {
    
    // 1. Taxa de Consumo do Refúgio
    game.settings.register("extincao", "consumptionRate", {
        name: "Taxa de Consumo Diário",
        hint: "Quantidade de Recursos consumidos por cada Habitante ao passar o dia.",
        scope: "world",     // "world" = Apenas o GM muda; "client" = Cada jogador muda o seu
        config: true,       // Aparece no menu de configurações
        type: Number,
        default: 1,         // Valor padrão
        range: { min: 0, max: 10, step: 1 } // Barra deslizante
    });

    // 2. Mensagem de Boas Vindas
    game.settings.register("extincao", "welcomeMessage", {
        name: "Exibir Boas Vindas",
        hint: "Mostra uma mensagem no chat quando o sistema inicia.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });

    // 3. Modo Hardcore (Exemplo de regra opcional)
    game.settings.register("extincao", "hardcoreMode", {
        name: "Modo Hardcore (Desespero Total)",
        hint: "Se ativado, todas as rolagens sofrem penalidade de -1 dado automaticamente.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: value => console.log(`Modo Hardcore alterado para: ${value}`)
    });
}