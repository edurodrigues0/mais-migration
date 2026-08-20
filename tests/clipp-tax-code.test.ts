import { describe, expect, it } from 'vitest'
import {
  indexTaxaUfRows,
  normalizeTaxaUfCodigo,
  padCestDigits,
  pickPreferredCestId,
  pickTaxaUfId,
  taxCodeDigits,
  uniqueTaxCodes
} from '@infrastructure/importer/tax-code'
import { destinationTaxaUfId } from '@infrastructure/importer/mais-gestao-ids'
import { MAIS_GESTAO_UPSERT_PRODUTO, MAIS_GESTAO_UPSERT_TAXAUF } from '@infrastructure/importer/mais-gestao-postgres-importer'

describe('tax code normalization', () => {
  it('keeps only digits from CFOP and CEST codes', () => {
    expect(taxCodeDigits('5.405')).toBe('5405')
    expect(taxCodeDigits(5405)).toBe('5405')
    expect(taxCodeDigits('03.010.00')).toBe('0301000')
    expect(taxCodeDigits('')).toBeNull()
  })

  it('pads CEST to 7 digits for lookup', () => {
    expect(padCestDigits('301000')).toBe('0301000')
    expect(padCestDigits('0301000')).toBe('0301000')
    expect(padCestDigits(null)).toBeNull()
  })

  it('prefers company CEST over global', () => {
    const map = pickPreferredCestId(
      [
        { id: 'global', digits: '0301000', idempresa: null },
        { id: 'emp', digits: '0301000', idempresa: 'emp-1' }
      ],
      'emp-1'
    )
    expect(map.get('0301000')).toBe('emp')
  })

  it('collects unique digit codes', () => {
    expect(uniqueTaxCodes(['5.405', '5405', null, '6102'])).toEqual(['5405', '6102'])
  })

  it('normalizes taxa UF CHAR padding and case', () => {
    expect(normalizeTaxaUfCodigo('fff ')).toBe('FFF')
    expect(normalizeTaxaUfCodigo('T00')).toBe('T00')
    expect(normalizeTaxaUfCodigo(Buffer.from('FFF '))).toBe('FFF')
    expect(normalizeTaxaUfCodigo('  ')).toBeNull()
  })

  it('picks idtaxauf by codigo, then by destination UUID', () => {
    const destId = 'dest-fff'
    const { byCodigo, ids } = indexTaxaUfRows([
      { id: destId, codigo: 'FFF ' },
      { id: destinationTaxaUfId('T00', 'clipp'), codigo: 'T00' }
    ])
    expect(pickTaxaUfId('fff', byCodigo, ids, destinationTaxaUfId('FFF', 'clipp'))).toBe(destId)
    expect(
      pickTaxaUfId('T00', byCodigo, ids, destinationTaxaUfId('T00', 'clipp'))
    ).toBe(destinationTaxaUfId('T00', 'clipp'))
    expect(pickTaxaUfId('ZZZ', byCodigo, ids, destinationTaxaUfId('ZZZ', 'clipp'))).toBeNull()
  })
})

describe('UPSERT produto Clipp', () => {
  it('includes idcest, idcfopsaida and PIS/COFINS CST columns', () => {
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('idcest')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('idcfopsaida')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('cstpis')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('cstcofins')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('idcest = EXCLUDED.idcest')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('idtaxauf')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('idtaxauf = EXCLUDED.idtaxauf')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('cstipientrada')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('cstpisentrada')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('cstcofinsentrada')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('ipientrada')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('aliquotapis')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('aliquotacofins')
    expect(MAIS_GESTAO_UPSERT_PRODUTO).toContain('aliquotaconfinsentrada')
  })

  it('includes taxauf UPSERT on codigo da empresa', () => {
    expect(MAIS_GESTAO_UPSERT_TAXAUF).toContain('INSERT INTO taxauf')
    expect(MAIS_GESTAO_UPSERT_TAXAUF).toContain('ON CONFLICT (idempresa, codigo)')
    expect(MAIS_GESTAO_UPSERT_TAXAUF).toContain('uf_sp')
  })
})
