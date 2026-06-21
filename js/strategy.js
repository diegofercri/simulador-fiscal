/*
 * strategy.js — ¿Sale a cuenta bajar la retención al 2 % e invertir la
 * diferencia para pagar la renta en junio?
 *
 * La maniobra es neutra en impuestos (ver irpf.js). El ÚNICO beneficio es el
 * interés neto que generan los euros aparcados mientras los tienes, en lugar de
 * dejárselos a Hacienda como retención (Hacienda no te paga intereses por
 * retenerte de más).
 *
 * Modelo: aportas la liquidez extra cada mes a una cuenta remunerada (TAE,
 * capitalización mensual), durante `mesesAcumulacion`, y mantienes el saldo
 * `mesesEspera` meses más hasta pagar la renta a finales de junio. El impuesto
 * del ahorro se descuenta del interés.
 */

/**
 * @param {object} opts
 * @param {number} opts.liquidezMensual - euros extra de caja al mes por bajar la retención.
 * @param {number} opts.mesesAcumulacion - meses aportando (típico 12).
 * @param {number} opts.mesesEspera - meses manteniendo el saldo tras dejar de aportar (Dic→Jun ≈ 6).
 * @param {number} opts.tae - TAE en fracción (0.02).
 * @param {number} opts.tipoAhorro - impuesto del ahorro en fracción (0.19).
 * @param {number} opts.importeRenta - lo que toca pagar en la declaración (€).
 * @param {number} opts.devolucionPerdida - devolución que dejas de cobrar al bajar la retención (€).
 */
function evaluarEstrategia(opts) {
  const { liquidezMensual, mesesAcumulacion, mesesEspera, tae, tipoAhorro } = opts;
  const tasaMensual = Math.pow(1 + tae, 1 / 12) - 1;

  let saldo = 0;
  let interesBruto = 0;
  let impuesto = 0;
  const meses = mesesAcumulacion + mesesEspera;

  for (let m = 1; m <= meses; m++) {
    if (m <= mesesAcumulacion) saldo += liquidezMensual;
    const ib = saldo * tasaMensual;
    const im = ib * tipoAhorro;
    saldo += ib - im;
    interesBruto += ib;
    impuesto += im;
  }

  const aportado = liquidezMensual * mesesAcumulacion;
  const interesNeto = interesBruto - impuesto;

  // Tras pagar la renta, lo que queda en la cuenta.
  const sobranteTrasPagar = saldo - opts.importeRenta;

  // El beneficio REAL incremental es solo el interés neto: la devolución que
  // dejas de cobrar (devolucionPerdida) la habrías recibido igualmente sin la
  // maniobra, así que no cuenta como ganancia.
  return {
    aportado,
    saldoFinal: saldo,
    interesBruto,
    impuesto,
    interesNeto,
    sobranteTrasPagar,
    beneficioReal: interesNeto,
    cubreRenta: saldo >= opts.importeRenta,
    devolucionPerdida: opts.devolucionPerdida,
    meses,
  };
}

window.Strategy = { evaluarEstrategia };
