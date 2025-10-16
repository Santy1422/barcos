'use client';

import { AgencyRecords } from '@/components/agency/agency-records';
import { SectionGuard } from '@/components/section-guard';

export default function AgencyRecordsPage() {
  return (
    <SectionGuard module="agency" section="records">
      <AgencyRecords />
    </SectionGuard>
  );
}