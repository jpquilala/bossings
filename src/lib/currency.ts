/**
 * Money is stored everywhere as an integer number of centavos.
 * P35.00 => 3500. Never use floats for money.
 */

/** Format centavos for display, e.g. 3500 => "P35" and 1050 => "P10.50". */
export function formatPeso(centavos: number): string {
  const pesos = centavos / 100;
  const hasFraction = centavos % 100 !== 0;
  return `P${pesos.toLocaleString("en-PH", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Convert a peso amount to centavos, e.g. 35 => 3500. */
export function toCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}
