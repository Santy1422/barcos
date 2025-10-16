'use client';

import { AgencySapInvoice } from '@/components/agency/agency-sap-invoice';
import { SectionGuard } from '@/components/section-guard';

export default function AgencySapInvoicePage() {
  return (
    <SectionGuard module="agency" section="sap-invoice">
      <AgencySapInvoice />
    </SectionGuard>
  );
}