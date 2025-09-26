// Types and interfaces for Agency Prefactura module

export interface PrefacturaData {
  prefacturaNumber: string
  notes: string
}

export interface AdditionalService {
  serviceId: string
  name: string
  description: string
  amount: number
  isLocalService?: boolean
}

export interface RecordFilters {
  searchTerm: string
  recordTypeFilter: "all" | "local" | "trasiego"
  statusFilter: "all" | "pendiente" | "completado"
  dateFilter: "createdAt" | "moveDate"
  startDate: string
  endDate: string
  isUsingPeriodFilter: boolean
  activePeriodFilter: "none" | "today" | "week" | "month" | "advanced"
}

export interface PrefacturaStepProps {
  onNext?: () => void
  onBack?: () => void
}

export interface PrefacturaTableProps {
  records: any[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onRecordView: (record: any) => void
  onRecordEdit: (record: any) => void
  onRecordDelete: (id: string) => void
}

export interface PrefacturaFiltersProps {
  filters: RecordFilters
  onFiltersChange: (filters: Partial<RecordFilters>) => void
  onSearch: () => void
}