/*
 * app.js — Une los inputs del DOM con la lógica de IRPF e interés compuesto
 * y renderiza las tablas, el aviso y el gráfico. Recalcula en cada cambio.
 */

const eur = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
const pct = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 2 }).format(n);

const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id).value) || 0;

let grafico = null;

/** Lee un porcentaje de input (en %) y lo devuelve como fracción. */
const frac = (id) => num(id) / 100;

function renderIRPF(r) {
  const resultadoTexto = (v) =>
    v > 0 ? `${eur(v)} a pagar` : v < 0 ? `${eur(-v)} a devolver` : '0 €';

  const filas = [
    ['Retención aplicada', pct(r.retActual), pct(r.retNueva), '—'],
    ['Retenido en el año', eur(r.retenidoActual), eur(r.retenidoNuevo), eur(r.retenidoNuevo - r.retenidoActual)],
    ['Cuota líquida real (impuesto)', eur(r.fiscal.cuotaLiquida), eur(r.fiscal.cuotaLiquida), eur(0)],
    [`Liquidez por paga (×${r.pagas})`, eur(0), eur(r.liquidezPorPaga), eur(r.liquidezPorPaga)],
    ['Liquidez extra mensual (÷12)', '—', '—', eur(r.liquidezMensual)],
    ['Carga impositiva acumulada anual', eur(r.fiscal.cuotaLiquida), eur(r.fiscal.cuotaLiquida), eur(0)],
    ['Ajuste en la declaración de la renta', resultadoTexto(r.declaracionActual), resultadoTexto(r.declaracionNueva), eur(r.declaracionNueva - r.declaracionActual)],
  ];

  const tbody = $('tabla-irpf').querySelector('tbody');
  tbody.innerHTML = filas
    .map(
      (f) =>
        `<tr><th scope="row">${f[0]}</th><td>${f[1]}</td><td>${f[2]}</td><td class="diff">${f[3]}</td></tr>`
    )
    .join('');

  $('aviso-texto').textContent =
    ` Bajar la retención te da ${eur(r.liquidezMensual)}/mes más de caja (${eur(r.liquidezAnual)}/año), ` +
    `pero la cuota líquida del IRPF sigue siendo ${eur(r.fiscal.cuotaLiquida)} (tipo medio real ${pct(r.fiscal.tipoMedioReal)}, ` +
    `marginal ${pct(r.fiscal.tipoMarginal)}). La declaración pasa a salir ${resultadoTexto(r.declaracionNueva)}. ` +
    `Ahorro fiscal real: ${eur(Math.abs(r.ahorroFiscalReal) < 0.01 ? 0 : r.ahorroFiscalReal)} — es diferimiento de caja, no un ahorro.`;
}

function renderEstrategia(r) {
  const importeRenta = Math.max(0, r.declaracionNueva);
  const devolucionPerdida = Math.max(0, -r.declaracionActual);

  const e = window.Strategy.evaluarEstrategia({
    liquidezMensual: r.liquidezMensual,
    mesesAcumulacion: Math.round(num('mesesAcum')),
    mesesEspera: Math.round(num('mesesEspera')),
    tae: frac('tae'),
    tipoAhorro: frac('tipoAhorro'),
    importeRenta,
    devolucionPerdida,
  });

  $('estr-summary').innerHTML = [
    ['Liquidez aparcada (aportado)', eur(e.aportado)],
    ['Saldo en junio (con interés)', eur(e.saldoFinal)],
    ['A pagar en la renta', eur(importeRenta)],
    ['Beneficio real (interés neto)', eur(e.beneficioReal)],
  ]
    .map(([k, v]) => `<div class="stat"><span>${k}</span><strong>${v}</strong></div>`)
    .join('');

  $('estr-periodo').textContent = `${e.meses} meses`;
  $('tabla-estrategia').querySelector('tbody').innerHTML = e.filas
    .map(
      (f) =>
        `<tr><td>${f.mes}</td><td>${eur(f.aportacion)}</td><td>${eur(f.saldoInicial)}</td>` +
        `<td>${eur(f.interesBruto)}</td><td>${eur(f.impuesto)}</td>` +
        `<td><strong>${eur(f.saldoFinal)}</strong></td></tr>`
    )
    .join('');

  const positivo = e.beneficioReal > 0 && e.cubreRenta;
  const box = $('estr-veredicto');
  box.className = 'callout ' + (positivo ? 'ok' : 'warn');
  box.innerHTML =
    `<strong>${positivo ? 'Sí, pero por poco.' : 'Cuidado.'}</strong> ` +
    `Aparcando ${eur(e.aportado)} a ${pct(frac('tae'))} TAE durante ${e.meses} meses ganas ` +
    `<strong>${eur(e.beneficioReal)}</strong> netos (tras el ${pct(frac('tipoAhorro'))} del ahorro). ` +
    `Es el único beneficio: la maniobra no ahorra impuestos. ` +
    (devolucionPerdida > 0
      ? `Ojo: los ${eur(e.sobranteTrasPagar)} que “sobran” incluyen ${eur(devolucionPerdida)} de devolución que habrías cobrado igualmente; no son ganancia. `
      : '') +
    `Solo compensa si <strong>inviertes la diferencia y no la gastas</strong>, y reservas los ` +
    `${eur(importeRenta)} para junio. Si te lo gastas, en junio tienes una factura sin fondos.`;
}

function renderCompuesto() {
  const opts = {
    capitalInicial: num('capitalInicial'),
    aportacionAnual: num('aportacionAnual'),
    tae: frac('tae'),
    tipoAhorro: frac('tipoAhorro'),
    anios: Math.max(1, Math.round(num('anios'))),
  };

  const { filas, totales } = window.Compound.proyectarCompuesto(opts);

  const tbody = $('tabla-compuesto').querySelector('tbody');
  tbody.innerHTML = filas
    .map(
      (f) =>
        `<tr><td>${f.anio}</td><td>${eur(f.saldoInicial)}</td><td>${eur(f.aportacion)}</td>` +
        `<td>${eur(f.interesBruto)}</td><td>${eur(f.impuesto)}</td><td>${eur(f.interesNeto)}</td>` +
        `<td><strong>${eur(f.saldoFinal)}</strong></td></tr>`
    )
    .join('');

  $('comp-summary').innerHTML = [
    ['Saldo final', eur(totales.saldoFinal)],
    ['Total aportado', eur(totales.totalAportado)],
    ['Ganancia neta (tras impuestos)', eur(totales.gananciaNeta)],
    ['Impuestos del ahorro pagados', eur(totales.totalImpuesto)],
  ]
    .map(([k, v]) => `<div class="stat"><span>${k}</span><strong>${v}</strong></div>`)
    .join('');

  renderGrafico(filas);
}

function renderGrafico(filas) {
  const canvas = $('grafico-saldo');
  if (typeof Chart === 'undefined') {
    canvas.hidden = true;
    $('chart-fallback').hidden = false;
    return;
  }
  const labels = filas.map((f) => `Año ${f.anio}`);
  const saldos = filas.map((f) => Math.round(f.saldoFinal));
  const aportadoAcum = filas.map((f, i) =>
    Math.round(filas[0].saldoInicial + f.aportacion * (i + 1))
  );

  if (grafico) {
    grafico.data.labels = labels;
    grafico.data.datasets[0].data = saldos;
    grafico.data.datasets[1].data = aportadoAcum;
    grafico.update();
    return;
  }

  grafico = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Saldo con interés', data: saldos, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)', fill: true, tension: 0.25 },
        { label: 'Aportado acumulado', data: aportadoAcum, borderColor: '#94a3b8', borderDash: [6, 4], fill: false, tension: 0 },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${eur(c.parsed.y)}` } },
      },
      scales: { y: { ticks: { callback: (v) => eur(v) } } },
    },
  });
}

function recalcular() {
  const bruto = num('bruto');
  const r = window.IRPF.compararRetenciones(
    bruto,
    frac('retActual'),
    frac('retNueva'),
    parseInt($('pagas').value, 10)
  );
  renderIRPF(r);
  renderEstrategia(r);
  renderCompuesto();
}

document.querySelectorAll('input, select').forEach((el) =>
  el.addEventListener('input', recalcular)
);

recalcular();
