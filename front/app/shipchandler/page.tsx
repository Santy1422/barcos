import { ShipChandlerUpload } from "@/components/shipchandler/shipchandler-upload"
import { SectionGuard } from "@/components/section-guard"

export default function ShipChandlerPage() {
  return (
    <SectionGuard module="shipchandler" section="upload">
      <ShipChandlerUpload />
    </SectionGuard>
  )
}

