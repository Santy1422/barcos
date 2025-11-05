import { PTYSSUpload } from "@/components/ptyss/ptyss-upload"
import { SectionGuard } from "@/components/section-guard"

export default function PTYSSUploadPage() {
  return (
    <SectionGuard module="ptyss" section="upload">
      <PTYSSUpload />
    </SectionGuard>
  )
} 