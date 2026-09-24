/* Formatação de dados da API para a tela. Um lugar só, para a mesma
   informação não aparecer de dois jeitos em páginas diferentes. */

// Criado uma vez só: montar Intl.NumberFormat é caro.
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatPrice(value) {
  return brl.format(value)
}

// TimeOnly chega como "05:40:00"; a tela só quer hora e minuto.
export function hourAndMinute(time) {
  return time.slice(0, 5)
}

const longDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

// DateOnly chega como "2026-10-01". NÃO dá para usar new Date("2026-10-01"):
// string só de data é lida como meia-noite UTC, que em Brasília ainda é o
// dia 30 às 21h — a passagem apareceria com a data errada. Montamos a
// data local a partir dos números.
export function parseDateOnly(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDateOnly(isoDate) {
  return longDate.format(parseDateOnly(isoDate))
}

// "2026-10-01" + "05:40:00" -> Date local daquele embarque.
export function boardingDateTime(isoDate, time) {
  const date = parseDateOnly(isoDate)
  const [hours, minutes] = time.split(':').map(Number)
  date.setHours(hours, minutes, 0, 0)
  return date
}
