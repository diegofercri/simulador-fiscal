/*
 * compound.js — Interés compuesto ANUAL (no diario) sobre capitales variables,
 * estilo cuenta remunerada Trade Republic, con retención del ahorro.
 *
 * Capitalización anual:
 *   interesBruto_n = saldoInicio_n * tae
 *   impuesto_n     = interesBruto_n * tipoAhorro
 *   interesNeto_n  = interesBruto_n - impuesto_n
 *   saldoFin_n     = saldoInicio_n + interesNeto_n + aportacion_n
 *
 * El impuesto del ahorro se descuenta del interés cada año (criterio
 * conservador: como si se liquidara anualmente). En España el ahorro tributa
 * por tramos (19% hasta 6.000 €, 21% hasta 50.000 €...); aquí se usa un tipo
 * fijo configurable (19% por defecto) por simplicidad y a petición.
 */

/**
 * Proyecta la evolución anual de un capital con aportaciones.
 * @param {object} opts
 * @param {number} opts.capitalInicial - saldo de partida en €.
 * @param {number} opts.aportacionAnual - aportación constante al inicio de cada año (€).
 * @param {number} opts.tae - TAE en fracción (p.ej. 0.02).
 * @param {number} opts.tipoAhorro - retención del ahorro en fracción (p.ej. 0.19).
 * @param {number} opts.anios - número de años a proyectar.
 * @returns {{filas: object[], totales: object}}
 */
function proyectarCompuesto({ capitalInicial, aportacionAnual, tae, tipoAhorro, anios }) {
  const filas = [];
  let saldo = capitalInicial;
  let totalInteresBruto = 0;
  let totalImpuesto = 0;

  for (let anio = 1; anio <= anios; anio++) {
    // La aportación del año se incorpora al inicio y genera interés ese año.
    const saldoBase = saldo + aportacionAnual;
    const interesBruto = saldoBase * tae;
    const impuesto = interesBruto * tipoAhorro;
    const interesNeto = interesBruto - impuesto;
    const saldoFinal = saldoBase + interesNeto;

    totalInteresBruto += interesBruto;
    totalImpuesto += impuesto;

    filas.push({
      anio,
      saldoInicial: saldo,
      aportacion: aportacionAnual,
      interesBruto,
      impuesto,
      interesNeto,
      saldoFinal,
    });

    saldo = saldoFinal;
  }

  const totalAportado = capitalInicial + aportacionAnual * anios;

  return {
    filas,
    totales: {
      saldoFinal: saldo,
      totalAportado,
      totalInteresBruto,
      totalImpuesto,
      totalInteresNeto: totalInteresBruto - totalImpuesto,
      gananciaNeta: saldo - totalAportado,
    },
  };
}

window.Compound = { proyectarCompuesto };
