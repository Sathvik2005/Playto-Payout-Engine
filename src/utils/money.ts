export const PAISE_IN_RUPEE = 100

export function formatPaiseToINR(paise: number): string {
  const amountInRupees = paise / PAISE_IN_RUPEE
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInRupees)
}

export function inrInputToPaise(inrValue: string): number {
  const normalizedValue = inrValue.replace(/,/g, '').trim()
  const asNumber = Number(normalizedValue)

  if (Number.isNaN(asNumber) || asNumber <= 0) {
    return 0
  }

  return Math.round(asNumber * PAISE_IN_RUPEE)
}
