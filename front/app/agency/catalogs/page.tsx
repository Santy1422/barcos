'use client';

import { AgencyCatalogs } from '@/components/agency/agency-catalogs';
import { SectionGuard } from '@/components/section-guard';

export default function AgencyCatalogsPage() {
  return (
    <SectionGuard module="agency" section="catalogs">
      <AgencyCatalogs />
    </SectionGuard>
  );
}