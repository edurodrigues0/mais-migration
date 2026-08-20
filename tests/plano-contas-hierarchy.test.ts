import { describe, expect, it } from 'vitest'
import {
  normalizePlanoContasCodigo,
  parentAccountCodigo,
  planoContasCodigoDepth,
  resolvePlanoContasParentUpdates
} from '@infrastructure/importer/plano-contas-hierarchy'

describe('plano de contas hierarchy', () => {
  it('derives parent codigo from space-separated levels', () => {
    expect(parentAccountCodigo('1')).toBeNull()
    expect(parentAccountCodigo('1 1')).toBe('1')
    expect(parentAccountCodigo('1 2')).toBe('1')
    expect(parentAccountCodigo('1 2 1')).toBe('1 2')
    expect(parentAccountCodigo('  1   2   1  ')).toBe('1 2')
  })

  it('derives parent codigo from dotted levels', () => {
    expect(parentAccountCodigo('1.1.01')).toBe('1.1')
    expect(parentAccountCodigo('1.1')).toBe('1')
    expect(normalizePlanoContasCodigo('1  2')).toBe('1 2')
    expect(planoContasCodigoDepth('1 2 1')).toBe(3)
    expect(planoContasCodigoDepth('1.2')).toBe(2)
  })

  it('assigns parent ids by codigo when idplanocontas is empty', () => {
    const raiz = { id: 'id-1', codigo: '1', idplanocontas: null }
    const filho1 = { id: 'id-1-1', codigo: '1 1', idplanocontas: null }
    const filho2 = { id: 'id-1-2', codigo: '1 2', idplanocontas: null }
    const neto = { id: 'id-1-2-1', codigo: '1 2 1', idplanocontas: null }

    const updates = resolvePlanoContasParentUpdates([neto, filho2, filho1, raiz])
    const byId = new Map(updates.map((item) => [item.id, item.idplanocontas]))

    expect(byId.has('id-1')).toBe(false)
    expect(byId.get('id-1-1')).toBe('id-1')
    expect(byId.get('id-1-2')).toBe('id-1')
    expect(byId.get('id-1-2-1')).toBe('id-1-2')
  })

  it('keeps an already valid parent fk', () => {
    const updates = resolvePlanoContasParentUpdates([
      { id: 'pai', codigo: '1', idplanocontas: null },
      { id: 'filho', codigo: '1 1', idplanocontas: 'pai' }
    ])
    expect(updates).toEqual([])
  })
})
