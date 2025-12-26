# ⚠️ Agency Module - Refactoring Required

## 📊 Analysis Complete

### ❌ Critical Components (>1000 lines)

1. **agency-prefactura.tsx** (3,619 lines)
   - Single function component handling entire prefactura workflow
   - Contains all steps, filters, tables, PDF generation in one file

2. **agency-config.tsx** (1,421 lines)
   - Monolithic configuration management
   - All settings in single component

3. **agency-local-routes.tsx** (1,051 lines)
   - Route management in single file
   - Mixing UI, business logic, and state management

## ✅ Well-Modularized Examples (Already Done)

The **pricing-config** subsystem shows proper modularization:
```
pricing-config/
├── pricing-config-main.tsx (839 lines) - Coordinator
├── distance-rates-editor.tsx (298 lines)
├── service-adjustments-editor.tsx (125 lines)
├── fixed-routes-editor.tsx (318 lines)
├── distance-matrix-editor.tsx (349 lines)
├── additional-charges-editor.tsx (168 lines)
├── discounts-editor.tsx (331 lines)
└── price-calculator.tsx (393 lines)
```

## 🔧 Refactoring Strategy for agency-prefactura.tsx

### Current Structure (3,619 lines in ONE file):
- Step 1: Record Selection (lines ~1873-2527)
- Step 2: Review & Additional Services (lines ~2528-3200)
- Step 3: PDF Generation & Completion (lines ~3201-3619)
- Filters, modals, tables all mixed together

### Proposed Modular Structure:
```
prefactura/
├── index.tsx                        # Main export
├── PrefacturaMain.tsx              # Coordinator (~300 lines)
├── steps/
│   ├── StepSelector.tsx            # Step 1 (~400 lines)
│   ├── StepReview.tsx              # Step 2 (~400 lines)
│   └── StepGenerate.tsx            # Step 3 (~300 lines)
├── components/
│   ├── PrefacturaFilters.tsx      # Filters UI (~250 lines)
│   ├── PrefacturaTable.tsx        # Table display (~300 lines)
│   ├── RecordViewModal.tsx        # View modal (~200 lines)
│   ├── RecordEditModal.tsx        # Edit modal (~200 lines)
│   └── AdditionalServices.tsx     # Services selector (~250 lines)
├── pdf/
│   ├── PrefacturaPDFGenerator.tsx # PDF logic (~400 lines)
│   └── PrefacturaPDFPreview.tsx   # Preview modal (~150 lines)
├── hooks/
│   ├── usePrefacturaFilters.ts    # Filter logic
│   ├── usePrefacturaSelection.ts  # Selection logic
│   └── usePrefacturaPDF.ts        # PDF generation
└── types.ts                        # All interfaces
```

## 📋 Action Items

### Immediate Priority:
1. **Refactor agency-prefactura.tsx** first (it's 3x larger than acceptable)
2. **Extract reusable components** (tables, filters, modals)
3. **Move business logic to custom hooks**
4. **Separate PDF generation logic**

### Benefits After Refactoring:
- ✅ Each file under 500 lines
- ✅ Clear separation of concerns
- ✅ Reusable components
- ✅ Easier to test
- ✅ Better maintainability
- ✅ Reduced build times

## 🚀 Implementation Steps

1. **Create directory structure**
2. **Extract types and interfaces**
3. **Split into step components**
4. **Extract common UI components**
5. **Move logic to hooks**
6. **Update imports**
7. **Test everything works**

## 📝 Notes

- The pricing-config module is a **good example** to follow
- Backend files are all **within acceptable limits** (<700 lines)
- Focus on **frontend refactoring** first

---

**Status**: Refactoring needed urgently for 3 components
**Priority**: HIGH - These files are unmaintainable at current size