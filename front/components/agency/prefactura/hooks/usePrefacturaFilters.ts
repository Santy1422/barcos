import { useState, useMemo } from "react"
import { RecordFilters } from "../types"

export function usePrefacturaFilters(records: any[]) {
  const [filters, setFilters] = useState<RecordFilters>({
    searchTerm: "",
    recordTypeFilter: "all",
    statusFilter: "all",
    dateFilter: "createdAt",
    startDate: "",
    endDate: "",
    isUsingPeriodFilter: false,
    activePeriodFilter: "none"
  })

  const updateFilters = (newFilters: Partial<RecordFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const getRecordType = (record: any): "local" | "trasiego" => {
    const data = record.data as Record<string, any>
    
    if (data.recordType) {
      return data.recordType
    }
    
    // Trasiego records have specific fields
    if (data.containerConsecutive || data.leg || data.moveType || data.associate) {
      return "trasiego"
    }
    
    // Local records have different fields
    if (data.clientId || data.order || data.naviera) {
      return "local"
    }
    
    return "local"
  }

  const filteredRecords = useMemo(() => {
    return records.filter((record: any) => {
      const data = record.data as Record<string, any>
      const recordType = getRecordType(record)
      
      // Exclude already pre-invoiced records
      if (record.invoiceId) {
        return false
      }
      
      // Type filter
      if (filters.recordTypeFilter !== "all" && recordType !== filters.recordTypeFilter) {
        return false
      }
      
      // Status filter
      if (filters.statusFilter !== "all" && record.status !== filters.statusFilter) {
        return false
      }
      
      // Date filter
      if (filters.startDate || filters.endDate) {
        let dateToCheck: string = ""
        
        if (filters.dateFilter === "createdAt") {
          dateToCheck = record.createdAt
        } else if (filters.dateFilter === "moveDate") {
          dateToCheck = data.moveDate || ""
        }
        
        if (dateToCheck) {
          const recordDate = new Date(dateToCheck)
          
          if (filters.startDate) {
            const start = new Date(filters.startDate + "T00:00:00")
            if (recordDate < start) return false
          }
          
          if (filters.endDate) {
            const end = new Date(filters.endDate + "T23:59:59.999")
            if (recordDate > end) return false
          }
        } else if (filters.dateFilter === "moveDate" && !dateToCheck) {
          return false
        }
      }
      
      // Search filter
      if (filters.searchTerm) {
        const searchableText = [
          data.container || "",
          data.order || "",
          data.containerConsecutive || "",
          data.associate || "",
          data.moveDate || "",
          record._id || "",
        ].filter(Boolean).join(" ").toLowerCase()
        
        if (!searchableText.includes(filters.searchTerm.toLowerCase())) {
          return false
        }
      }
      
      return true
    }).sort((a: any, b: any) => {
      // Sort by creation date: newest first
      const dateA = new Date(a.createdAt || 0)
      const dateB = new Date(b.createdAt || 0)
      return dateB.getTime() - dateA.getTime()
    })
  }, [records, filters])

  const recordCounts = useMemo(() => {
    const counts = {
      total: records.length,
      filtered: filteredRecords.length,
      local: 0,
      trasiego: 0,
      pendiente: 0,
      completado: 0,
      prefacturado: 0
    }

    records.forEach((record: any) => {
      const recordType = getRecordType(record)
      if (recordType === "local") counts.local++
      else counts.trasiego++
      
      if (record.status === "pendiente") counts.pendiente++
      else if (record.status === "completado") counts.completado++
      
      if (record.invoiceId) counts.prefacturado++
    })

    return counts
  }, [records, filteredRecords])

  return {
    filters,
    updateFilters,
    filteredRecords,
    recordCounts,
    getRecordType
  }
}