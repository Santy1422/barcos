import { AgencyConfig } from "@/components/agency/agency-config"
import { SectionGuard } from "@/components/section-guard"

export default function AgencyConfigPage() {
  return (
    <SectionGuard module="agency" section="config">
      <AgencyConfig />
    </SectionGuard>
  )
} 