/* =========================================================
   Dados estáticos — provisórios.

   As cidades já saíram daqui: agora vêm de GET /cities/list.
   As saídas continuam falsas porque a API ainda não expõe
   GET /boardings (RF-24 do seu doc de requisitos).

   Os campos usam os MESMOS nomes que a API devolve, em
   camelCase — que é como o ASP.NET serializa por padrão.
   Preços seguem a regra da API: km × R$ 0,42 por km.
   ========================================================= */
export const DEPARTURES = [
  {
    id: 1,
    time: '05:40',
    from: 'Udia',
    to: 'Ura',
    kilometers: 105,
    duration: '1h50',
    price: 44.1,
    seats: 28,
  },
  {
    id: 2,
    time: '06:15',
    from: 'Udia',
    to: 'Indi',
    kilometers: 55,
    duration: '1h10',
    price: 23.1,
    seats: 12,
  },
  {
    id: 3,
    time: '07:30',
    from: 'Reri',
    to: 'Udia',
    kilometers: 35,
    duration: '50min',
    price: 14.7,
    seats: 4,
  },
  {
    id: 4,
    time: '09:00',
    from: 'Indi',
    to: 'Udia',
    kilometers: 55,
    duration: '1h10',
    price: 23.1,
    seats: 19,
  },
  {
    id: 5,
    time: '13:45',
    from: 'Udia',
    to: 'Reri',
    kilometers: 35,
    duration: '50min',
    price: 14.7,
    seats: 31,
  },
  {
    id: 6,
    time: '18:20',
    from: 'Ura',
    to: 'Udia',
    kilometers: 105,
    duration: '1h50',
    price: 44.1,
    seats: 2,
  },
]
