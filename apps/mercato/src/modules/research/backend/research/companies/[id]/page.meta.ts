export const metadata = {
  requireAuth: true,
  requireFeatures: ['customers.companies.view', 'research.view'],
  pageTitle: 'Company profile',
  pageTitleKey: 'research.profile.title',
  pageGroup: 'Customers',
  pageGroupKey: 'customers.nav.group',
  navHidden: true,
  breadcrumb: [
    { label: 'Companies', labelKey: 'customers.nav.companies', href: '/backend/customers/companies' },
  ],
}
