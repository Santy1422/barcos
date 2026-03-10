'use client';

import { AgencyCrearPrefactura } from '@/components/agency/agency-crear-prefactura';
import { SectionGuard } from '@/components/section-guard';

export default function AgencyPrefacturaPage() {
  return (
    <SectionGuard module="agency" section="sap-invoice">
      <AgencyCrearPrefactura />
    </SectionGuard>
  );
}
