export function moneyOreToNok(valueOre: bigint): number {
  return Number(valueOre) / 100;
}

export function formatNok(amountNok: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amountNok);
}