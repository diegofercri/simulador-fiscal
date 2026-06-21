# Simulador fiscal: retención IRPF e interés compuesto

Herramienta web estática (sin backend) que simula dos cosas:

1. **Impacto de bajar la retención del IRPF** del 18 % al 2 % (mínimo legal) sobre un bruto de
   30.000 €/año: diferencia de liquidez mensual, carga impositiva acumulada anual y ajuste obligatorio
   en la declaración de la renta.
2. **Interés compuesto anual** (TAE, capitalización anual — no diaria) de un capital con aportaciones
   variables, estilo cuenta remunerada de Trade Republic, descontando el impuesto del ahorro.

➡️ **Demo:** https://diegofercri.github.io/simulador-fiscal/

## Lo que tienes que entender antes de usarlo

Bajar la **retención** mensual **no reduce el impuesto que pagas**. La cuota líquida del IRPF depende de
tu renta y tu tramo, no de cuánto te retenga la empresa. Si retienen menos cada mes, tienes más caja
ahora, pero la **declaración de la renta sale a pagar** por esa misma diferencia.

Ejemplo con 30.000 € de bruto:

| Concepto | Retención 18 % | Retención 2 % |
|---|---|---|
| Retenido en el año | 5.400 € | 600 € |
| Cuota líquida real (impuesto) | 4.939,50 € | 4.939,50 € |
| Resultado de la renta | −460,50 € (a devolver) | +4.339,50 € (a pagar) |
| Liquidez extra mensual | — | +400 €/mes |
| **Ahorro fiscal real** | — | **0 €** |

Es **diferimiento de caja**, no ahorro. Tener los 400 €/mes durante el año puede ser útil (p. ej.
invertirlos), pero hay que reservar para el pago de la renta.

## Fórmulas

### IRPF (`js/irpf.js`)
Modelo simplificado de la cuota líquida estatal+autonómica (escala general 2025):

```
seguridad_social = bruto × 6,35 %
base_imponible   = bruto − seguridad_social − 2.000 (gastos art. 19)
cuota_bruta      = escala_progresiva(base_imponible)   # 19/24/30/37/45/47 %
cuota_liquida    = cuota_bruta − 5.550 × 19 %           # mínimo personal
resultado_renta  = cuota_liquida − retenido             # + a pagar / − a devolver
```

### Interés compuesto (`js/compound.js`)
Capitalización anual con impuesto del ahorro descontado cada año:

```
saldo_base    = saldo_anterior + aportacion
interes_bruto = saldo_base × TAE
impuesto      = interes_bruto × tipo_ahorro   # 19 % por defecto
saldo_final   = saldo_base + interes_bruto − impuesto
```

## Estructura

```
index.html       UI, inputs y tablas
css/styles.css   estilos (responsive, claro/oscuro)
js/irpf.js       lógica del IRPF
js/compound.js   interés compuesto
js/app.js        binding DOM + render + gráfico (Chart.js)
```

Sin paso de build: se abre `index.html` directamente o se sirve como sitio estático.

## Limitaciones

- Modelo simplificado: no incluye deducciones personales/familiares más allá del mínimo personal ni
  variaciones por comunidad autónoma.
- El ahorro tributa realmente **por tramos** (19 % hasta 6.000 €, 21 % hasta 50.000 €, 23 %…); aquí se
  usa un tipo fijo configurable (19 % por defecto).
- **No es asesoramiento fiscal.** Consulta tu caso con un profesional.
