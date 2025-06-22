import { EditPage } from "@/components/edit-page"

export default function EditarPage({ params }: { params: { id: string } }) {
  return <EditPage id={params.id} />
}
