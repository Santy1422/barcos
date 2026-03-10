'use client';

import { AgencyFacturas } from '@/components/agency/agency-facturas';
import { SectionGuard } from '@/components/section-guard';

export default function AgencyInvoicePage() {
  return (
    <SectionGuard module="agency" section="sap-invoice">
      <AgencyFacturas />
    </SectionGuard>
  );
}
