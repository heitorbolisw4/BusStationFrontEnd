/* Validação no front espelhando as regras da API (AuthEndpoints.cs,
   ValidateRegistration). A API continua sendo a fonte da verdade — isto
   aqui só existe para o usuário ver o erro na hora, em português, sem
   ida e volta ao servidor. Se a regra mudar lá, tem que mudar aqui.

   Cada função devolve um objeto { campo: 'mensagem' }; vazio = válido. */

export const MIN_PASSWORD_LENGTH = 6
export const MIN_AGE = 18

export function validateLogin({ email, password }) {
  const errors = {}
  if (!email.trim()) errors.email = 'Informe seu e-mail.'
  if (!password) errors.password = 'Informe sua senha.'
  return errors
}

export function validateRegistration({ name, email, password, age }) {
  const errors = {}

  if (!name.trim()) errors.name = 'Informe seu nome.'

  // Mesma regra (frouxa) da API: só exige um @. O <input type="email">
  // do navegador já barra formatos piores antes de chegar aqui.
  if (!email.trim() || !email.includes('@')) errors.email = 'Informe um e-mail válido.'

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }

  const ageNumber = Number(age)
  if (age === '' || !Number.isInteger(ageNumber)) {
    errors.age = 'Informe sua idade.'
  } else if (ageNumber < MIN_AGE) {
    errors.age = `É preciso ter pelo menos ${MIN_AGE} anos para comprar passagem.`
  }

  return errors
}
