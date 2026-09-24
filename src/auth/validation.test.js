import { describe, expect, it } from 'vitest'
import { validateLogin, validateRegistration } from './validation'

const VALID = { name: 'Maria', email: 'maria@example.com', password: '123456', age: '18' }

describe('validateLogin', () => {
  it('aceita e-mail e senha preenchidos', () => {
    expect(validateLogin({ email: 'a@b.c', password: 'x' })).toEqual({})
  })

  it('exige os dois campos (e-mail só com espaços conta como vazio)', () => {
    expect(validateLogin({ email: '   ', password: '' })).toEqual({
      email: 'Informe seu e-mail.',
      password: 'Informe sua senha.',
    })
  })
})

// Os limites espelham ValidateRegistration da API. Se estes testes
// mudarem, a regra do back tem que ter mudado junto.
describe('validateRegistration', () => {
  it('aceita um cadastro no limite de tudo (senha 6, idade 18)', () => {
    expect(validateRegistration(VALID)).toEqual({})
  })

  it('nome só com espaços é inválido', () => {
    expect(validateRegistration({ ...VALID, name: '  ' })).toHaveProperty('name')
  })

  it('e-mail sem @ é inválido (mesma regra frouxa da API)', () => {
    expect(validateRegistration({ ...VALID, email: 'maria.example.com' })).toHaveProperty('email')
  })

  it('senha de 5 caracteres é inválida, de 6 é válida', () => {
    expect(validateRegistration({ ...VALID, password: '12345' })).toHaveProperty('password')
    expect(validateRegistration({ ...VALID, password: '123456' })).not.toHaveProperty('password')
  })

  it.each([
    ['17', /pelo menos 18 anos/],
    ['', /Informe sua idade/],
    ['18.5', /Informe sua idade/],
    ['abc', /Informe sua idade/],
  ])('idade "%s" é inválida', (age, message) => {
    expect(validateRegistration({ ...VALID, age }).age).toMatch(message)
  })

  it('devolve todos os erros de uma vez, não só o primeiro', () => {
    const errors = validateRegistration({ name: '', email: '', password: '', age: '' })
    expect(Object.keys(errors).sort()).toEqual(['age', 'email', 'name', 'password'])
  })
})
