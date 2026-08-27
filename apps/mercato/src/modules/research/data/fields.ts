import { cf, defineFields } from '@open-mercato/shared/modules/dsl'

export const FLOW_COMPANY_CUSTOM_FIELDS = [
  cf.text('nip', {
    label: 'NIP',
    description: 'Numer identyfikacji podatkowej.',
    formEditable: true,
    filterable: true,
  }),
  cf.text('krs', {
    label: 'KRS',
    description: 'Numer KRS spółki.',
    formEditable: true,
    filterable: true,
  }),
  cf.text('profit', {
    label: 'Zysk',
    description: 'Zysk firmy (wartość z researchu albo CRM).',
    formEditable: true,
  }),
  cf.boolean('nda', {
    label: 'NDA',
    description: 'Czy podpisano NDA.',
    defaultValue: false,
    formEditable: true,
    filterable: true,
  }),
  cf.date('nda_date', {
    label: 'NDA data',
    description: 'Data podpisania NDA.',
    formEditable: true,
  }),
  cf.text('nda_drive_url', {
    label: 'NDA link do dysku',
    description: 'Link do pliku NDA na dysku.',
    formEditable: true,
  }),
  cf.multiline('related_companies', {
    label: 'Spółki powiązane',
    description: 'Powiązane spółki, po jednej w wierszu.',
    formEditable: true,
  }),
]

export const fieldSets = [
  defineFields('customers:customer_company_profile', FLOW_COMPANY_CUSTOM_FIELDS, 'research'),
]

export default fieldSets
