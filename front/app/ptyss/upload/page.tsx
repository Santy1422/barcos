import { PTYSSUpload } from "@/components/ptyss/ptyss-upload"
import { SectionGuard } from "@/components/section-guard"

export default function PTYSSUploadPage() {
  return (
    <SectionGuard module="shipchandler" section="upload">
      <PTYSSUpload />
    </SectionGuard>
  )
} 