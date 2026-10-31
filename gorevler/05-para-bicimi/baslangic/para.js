export function paraYaz(tutar) {
  return `${tutar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
}
