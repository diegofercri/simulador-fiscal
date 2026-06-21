/*
 * irpf.js — Lógica del IRPF español (rendimientos del trabajo).
 *
 * Modelo simplificado pero realista de la cuota líquida estatal+autonómica,
 * usando la escala general agregada y las constantes de 2025. No contempla
 * deducciones personales/familiares más allá del mínimo personal, ni
 * particularidades por comunidad autónoma. No es asesoramiento fiscal.
 */

// Escala general agregada del IRPF (estatal + autonómica de referencia), 2025.
// Cada tramo: { hasta: límite superior de base en €, tipo: marginal }.
const ESCALA_IRPF = [
  { hasta: 12450, tipo: 0.19 },
  { hasta: 20200, tipo: 0.24 },
  { hasta: 35200, tipo: 0.30 },
  { hasta: 60000, tipo: 0.37 },
  { hasta: 300000, tipo: 0.45 },
  { hasta: Infinity, tipo: 0.47 },
];

const TIPO_SEGURIDAD_SOCIAL = 0.0635; // 6,35% cuota del trabajador
const GASTOS_DEDUCIBLES = 2000;       // "otros gastos" art. 19 LIRPF
const MINIMO_PERSONAL = 5550;         // mínimo del contribuyente

/**
 * Aplica una escala progresiva por tramos a una base.
 * @returns {number} cuota resultante.
 */
function aplicarEscala(base, escala) {
  let cuota = 0;
  let anterior = 0;
  for (const tramo of escala) {
    if (base <= anterior) break;
    const gravadoEnTramo = Math.min(base, tramo.hasta) - anterior;
    cuota += gravadoEnTramo * tramo.tipo;
    anterior = tramo.hasta;
  }
  return cuota;
}

/**
 * Devuelve el tipo marginal aplicable a una base imponible.
 */
function tipoMarginal(base) {
  for (const tramo of ESCALA_IRPF) {
    if (base <= tramo.hasta) return tramo.tipo;
  }
  return ESCALA_IRPF[ESCALA_IRPF.length - 1].tipo;
}

/**
 * Calcula la fiscalidad real del IRPF para un bruto anual del trabajo.
 * @param {number} bruto - salario bruto anual en €.
 * @returns {object} desglose de base, cuota líquida y tipo medio/marginal.
 */
function calcularIRPF(bruto) {
  const seguridadSocial = bruto * TIPO_SEGURIDAD_SOCIAL;
  const baseImponible = Math.max(0, bruto - seguridadSocial - GASTOS_DEDUCIBLES);

  const cuotaBruta = aplicarEscala(baseImponible, ESCALA_IRPF);
  const deduccionMinimo = MINIMO_PERSONAL * ESCALA_IRPF[0].tipo;
  const cuotaLiquida = Math.max(0, cuotaBruta - deduccionMinimo);

  return {
    bruto,
    seguridadSocial,
    baseImponible,
    cuotaLiquida,
    tipoMedioReal: bruto > 0 ? cuotaLiquida / bruto : 0,
    tipoMarginal: tipoMarginal(baseImponible),
  };
}

/**
 * Compara dos porcentajes de retención sobre el mismo bruto y calcula
 * la diferencia de liquidez y el ajuste obligatorio en la declaración.
 *
 * Insight clave: la cuota líquida NO cambia con la retención. Retener menos
 * solo adelanta caja; la diferencia se regulariza en la renta (sale a pagar).
 *
 * @param {number} bruto - salario bruto anual.
 * @param {number} retActual - retención actual (fracción, p.ej. 0.18).
 * @param {number} retNueva - retención nueva (fracción, p.ej. 0.02).
 * @param {number} pagas - número de pagas (12 o 14).
 */
function compararRetenciones(bruto, retActual, retNueva, pagas) {
  const fiscal = calcularIRPF(bruto);

  const retenidoActual = bruto * retActual;
  const retenidoNuevo = bruto * retNueva;

  // Resultado de la declaración = cuota líquida − retenido.
  // Positivo => a pagar; negativo => a devolver.
  const declaracionActual = fiscal.cuotaLiquida - retenidoActual;
  const declaracionNueva = fiscal.cuotaLiquida - retenidoNuevo;

  const liquidezAnual = retenidoActual - retenidoNuevo; // caja extra durante el año
  const liquidezPorPaga = liquidezAnual / pagas;
  const liquidezMensual = liquidezAnual / 12;

  // Ahorro fiscal real = lo que ganas en caja − lo que tienes que devolver.
  // Debe dar ~0: es diferimiento, no ahorro.
  const ahorroFiscalReal = liquidezAnual - (declaracionNueva - declaracionActual);

  return {
    fiscal,
    retenidoActual,
    retenidoNuevo,
    declaracionActual,
    declaracionNueva,
    liquidezAnual,
    liquidezMensual,
    liquidezPorPaga,
    ahorroFiscalReal,
    pagas,
  };
}

// Exposición global para uso desde app.js (sin bundler).
window.IRPF = {
  ESCALA_IRPF,
  TIPO_SEGURIDAD_SOCIAL,
  GASTOS_DEDUCIBLES,
  MINIMO_PERSONAL,
  calcularIRPF,
  compararRetenciones,
  tipoMarginal,
};
