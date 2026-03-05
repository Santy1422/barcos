# API Tests

## Running Tests

```bash
cd api
npm test
```

## Test Coverage

### Pagination Tests (`pagination.test.ts`)

Tests for server-side pagination functionality used by the optimized PTG pages.

#### Endpoints Tested:
1. **getRecordsByModule** - `/api/records/:module`
   - Paginated records retrieval
   - Case-insensitive module matching
   - Status filter
   - Default behavior without pagination params

2. **getAllAutoridadesRecords** - `/api/records/autoridades`
   - Paginated autoridades records retrieval
   - Auth type filter (APA/QUA)
   - Status filter
   - Date range filters
   - Default behavior without pagination

3. **getInvoicesByModule** - `/api/invoices/:module`
   - Paginated invoices retrieval
   - Case-insensitive module matching
   - Type filter (auth/normal)
   - Search filter

#### Edge Cases:
- Page 0 handling (defaults to 1)
- Invalid limit handling (defaults to 10)
- Correct skip calculation for different pages
- Correct total pages calculation (ceiling division)

## Adding New Tests

1. Create a new test file in `src/__tests__/`
2. Use the `createMockReqRes` helper for request/response mocking
3. Mock database models before imports using `jest.mock`

## Test Structure

```typescript
describe('FeatureName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    // Setup mocks
    // Call function
    // Assert results
  });
});
```
