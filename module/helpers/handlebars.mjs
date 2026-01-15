export const registerHandlebarsHelpers = function () {

    // --- LÓGICA MATEMÁTICA E COMPARAÇÃO ---

    // Igualdade (eq)
    Handlebars.registerHelper('eq', function (a, b) {
        return a === b;
    });

    Handlebars.registerHelper('eq', function (a, b) { return a == b; });
    Handlebars.registerHelper('gte', function (a, b) { return Number(a) >= Number(b); });

    // Diferença (ne)
    Handlebars.registerHelper('ne', function (a, b) {
        return a !== b;
    });

    // Maior ou igual (gte)
    Handlebars.registerHelper('gte', function (a, b) {
        return a >= b;
    });

    // Menor ou igual (lte)
    Handlebars.registerHelper('lte', function (a, b) {
        return a <= b;
    });

    // --- LÓGICA BOOLEANA ---

    // Lógica OU (or)
    Handlebars.registerHelper('or', function (a, b) {
        return a || b;
    });

    // Lógica E (and)
    Handlebars.registerHelper('and', function (a, b) {
        return a && b;
    });

    // --- UTILITÁRIOS DE LOOP ---

    // Range: Cria um array de números para loops (ex: range 1 6 -> [1,2,3,4,5,6])
    Handlebars.registerHelper('range', function (start, end) {
        const range = [];
        for (let i = start; i <= end; i++) {
            range.push(i);
        }
        return range;
    });

    // Helper Select (caso o nativo falhe)
    Handlebars.registerHelper('select', function (value, options) {
        var $el = $('<select />').html(options.fn(this));
        $el.find('[value="' + value + '"]').attr({ 'selected': 'selected' });
        return $el.html();
    });

    // Objeto: Permite criar objetos simples no template (útil para selectOptions)
    Handlebars.registerHelper('object', function ({ hash }) {
        return hash;
    });
};