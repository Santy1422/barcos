'use client';

import { AgencyServicesUnified } from '@/components/agency/agency-services-unified';
import { SectionGuard } from '@/components/section-guard';

export default function AgencyServicesPage() {
  return (
    <SectionGuard module="agency" section="services">
      <AgencyServicesUnified />
    </SectionGuard>
  );
}