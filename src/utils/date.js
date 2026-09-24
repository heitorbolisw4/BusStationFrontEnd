/* <input type="date"> só entende o formato aaaa-mm-dd.

   Não dá para usar new Date().toISOString().slice(0, 10): toISOString
   converte para UTC antes de formatar. Em Brasília (UTC-3), a partir
   das 21h isso já devolve a data de AMANHÃ — e o campo de data passava
   a bloquear o dia de hoje como se fosse passado.

   `now` é parâmetro só para o teste conseguir fixar o relógio. */
export function todayISO(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
