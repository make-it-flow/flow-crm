"use client"

import { FlowCompanyProfile } from '../../../../components/FlowCompanyProfile'

export default function ResearchCompanyPage({ params }: { params?: { id?: string } }) {
  return <FlowCompanyProfile companyId={params?.id} />
}
