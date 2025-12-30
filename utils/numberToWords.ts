export const numberToWords = (value: number): string => {
    if (value === 0) return 'zero reais';

    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const onze_dezenove = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    const convertGroup = (n: number): string => {
        if (n === 0) return '';
        if (n === 100) return 'cem';

        let str = '';
        const c = Math.floor(n / 100);
        const d = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (c > 0) str += centenas[c];

        if (d === 1 && u >= 0) {
            if (str) str += ' e ';
            str += onze_dezenove[u];
            return str;
        }

        if (d > 0) {
            if (str) str += ' e ';
            str += dezenas[d];
        }

        if (u > 0) {
            if (str) str += ' e ';
            str += unidades[u];
        }

        return str;
    };

    // Separar inteiros e centavos
    const inteiro = Math.floor(value);
    const centavos = Math.round((value - inteiro) * 100);

    let resultado = '';

    // Tratar parte inteira (simplificado para até milhões)
    if (inteiro > 0) {
        const milhoes = Math.floor(inteiro / 1000000);
        const milhares = Math.floor((inteiro % 1000000) / 1000);
        const resto = inteiro % 1000;

        if (milhoes > 0) {
            resultado += convertGroup(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões');
        }

        if (milhares > 0) {
            if (resultado) resultado += ' e '; // Simplificação: usar vírgula em casos complexos
            // Ajuste para "mil" em vez de "um mil"
            if (milhares === 1 && milhoes === 0) { // Se for apenas "mil"
                resultado = 'mil'; // Começa com mil
            } else {
                resultado += convertGroup(milhares) + ' mil';
            }
        }

        if (resto > 0) {
            if (resultado && (resto < 100 || resto % 100 === 0)) resultado += ' e ';
            else if (resultado) resultado += ', ';
            resultado += convertGroup(resto);
        }

        resultado += (inteiro === 1) ? ' real' : ' reais';
    }

    // Tratar centavos
    if (centavos > 0) {
        if (resultado) resultado += ' e ';
        resultado += convertGroup(centavos);
        resultado += (centavos === 1) ? ' centavo' : ' centavos';
    }

    return resultado;
};
