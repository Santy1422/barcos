import { TruckingUpload } from "@/components/trucking/trucking-upload"
import { SectionGuard } from "@/components/section-guard"

export default function TruckingUploadPage() {
  return (
    <SectionGuard module="trucking" section="upload">
      <TruckingUpload />
    </SectionGuard>
  )
}
