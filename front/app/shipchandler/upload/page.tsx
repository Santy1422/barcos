import { ShipChandlerUpload } from "@/components/shipchandler/shipchandler-upload"
import { SectionGuard } from "@/components/section-guard"

export default function ShipChandlerUploadPage() {
  return (
    <SectionGuard module="shipchandler" section="upload">
      <ShipChandlerUpload />
    </SectionGuard>
  )
}

