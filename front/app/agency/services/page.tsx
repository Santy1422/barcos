'use client';

import { AgencyServices } from '@/components/agency/agency-services';
import { SectionGuard } from '@/components/section-guard';

export default function AgencyServicesPage() {
  return (
    <SectionGuard module="agency" section="services">
      <AgencyServices />
    </SectionGuard>
  );
}