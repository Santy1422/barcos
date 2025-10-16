import { TruckingConfig } from "@/components/trucking/trucking-config"
import { SectionGuard } from "@/components/section-guard"

export default function TruckingConfigPage() {
  return (
    <SectionGuard module="trucking" section="config">
      <TruckingConfig />
    </SectionGuard>
  )
}
