/**
 * Tests for pagination functionality in API endpoints
 * These tests verify that server-side pagination works correctly
 * for the optimized PTG pages.
 */

import { Request, Response } from 'express';

// Create mock objects - must be defined before jest.mock
const mockRecordsModel = {
  find: jest.fn().mockReturnThis(),
  countDocuments: jest.fn(),
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

const mockRecordsAutoridadesModel = {
  find: jest.fn().mockReturnThis(),
  countDocuments: jest.fn(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

const mockInvoicesModel = {
  find: jest.fn().mockReturnThis(),
  countDocuments: jest.fn(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

// Mock the database module before imports
jest.mock('../database', () => ({
  records: mockRecordsModel,
  recordsAutoridades: mockRecordsAutoridadesModel,
  invoices: mockInvoicesModel,
}));

import getRecordsByModule from '../controllers/recordsControllers/getRecordsByModule';
import { getAllAutoridadesRecords } from '../controllers/recordsControllers/getAllAutoridadesRecords';
import getInvoicesByModule from '../controllers/invoicesControllers/getInvoicesByModule';

// Helper to create mock request/response
const createMockReqRes = (params: any = {}, query: any = {}) => {
  const req = {
    params,
    query,
    user: { _id: 'test-user-id', email: 'test@test.com' },
  } as unknown as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  return { req, res };
};

describe('Pagination Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecordsByModule', () => {
    it('should return paginated records with correct pagination metadata', async () => {
      const mockRecords = [
        { _id: '1', blNumber: 'BL001', module: 'trucking' },
        { _id: '2', blNumber: 'BL002', module: 'trucking' },
      ];

      // Mock the chain of calls
      mockRecordsModel.find.mockReturnThis();
      mockRecordsModel.populate.mockReturnThis();
      mockRecordsModel.sort.mockReturnThis();
      mockRecordsModel.skip.mockReturnThis();
      mockRecordsModel.limit.mockResolvedValue(mockRecords);
      mockRecordsModel.countDocuments.mockResolvedValue(50);

      const { req, res } = createMockReqRes(
        { module: 'trucking' },
        { page: '1', limit: '20' }
      );

      await getRecordsByModule(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockRecords,
          pagination: expect.objectContaining({
            current: 1,
            pages: 3, // 50 / 20 = 2.5 -> 3
            total: 50,
          }),
        })
      );
    });

    it('should use case-insensitive module matching', async () => {
      const mockRecords = [{ _id: '1', module: 'Trucking' }];

      mockRecordsModel.find.mockReturnThis();
      mockRecordsModel.populate.mockReturnThis();
      mockRecordsModel.sort.mockReturnThis();
      mockRecordsModel.skip.mockReturnThis();
      mockRecordsModel.limit.mockResolvedValue(mockRecords);
      mockRecordsModel.countDocuments.mockResolvedValue(1);

      const { req, res } = createMockReqRes(
        { module: 'TRUCKING' },
        { page: '1', limit: '20' }
      );

      await getRecordsByModule(req, res);

      // Verify that find was called with a case-insensitive regex
      expect(mockRecordsModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          module: expect.objectContaining({
            $regex: expect.any(RegExp),
          }),
        })
      );

      const callArgs = mockRecordsModel.find.mock.calls[0][0];
      expect(callArgs.module.$regex.flags).toBe('i');
    });

    it('should apply status filter when provided', async () => {
      mockRecordsModel.find.mockReturnThis();
      mockRecordsModel.populate.mockReturnThis();
      mockRecordsModel.sort.mockReturnThis();
      mockRecordsModel.skip.mockReturnThis();
      mockRecordsModel.limit.mockResolvedValue([]);
      mockRecordsModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        { module: 'trucking' },
        { page: '1', limit: '20', status: 'pendiente' }
      );

      await getRecordsByModule(req, res);

      expect(mockRecordsModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pendiente',
        })
      );
    });

    it('should return all records when no pagination params provided', async () => {
      const mockRecords = [
        { _id: '1', blNumber: 'BL001' },
        { _id: '2', blNumber: 'BL002' },
      ];

      mockRecordsModel.find.mockReturnThis();
      mockRecordsModel.populate.mockReturnThis();
      mockRecordsModel.sort.mockResolvedValue(mockRecords);

      const { req, res } = createMockReqRes(
        { module: 'trucking' },
        {} // No page/limit
      );

      await getRecordsByModule(req, res);

      expect(mockRecordsModel.skip).not.toHaveBeenCalled();
      expect(mockRecordsModel.limit).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockRecords,
          pagination: expect.objectContaining({
            total: 2,
          }),
        })
      );
    });

    it('should exclude prefacturado/facturado by default', async () => {
      mockRecordsModel.find.mockReturnThis();
      mockRecordsModel.populate.mockReturnThis();
      mockRecordsModel.sort.mockReturnThis();
      mockRecordsModel.skip.mockReturnThis();
      mockRecordsModel.limit.mockResolvedValue([]);
      mockRecordsModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        { module: 'trucking' },
        { page: '1', limit: '20' }
      );

      await getRecordsByModule(req, res);

      // Should exclude prefacturado and facturado by default
      expect(mockRecordsModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $nin: ['prefacturado', 'facturado'] },
        })
      );
    });

    it('should include all statuses when status=all', async () => {
      mockRecordsModel.find.mockReturnThis();
      mockRecordsModel.populate.mockReturnThis();
      mockRecordsModel.sort.mockReturnThis();
      mockRecordsModel.skip.mockReturnThis();
      mockRecordsModel.limit.mockResolvedValue([]);
      mockRecordsModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        { module: 'trucking' },
        { page: '1', limit: '20', status: 'all' }
      );

      await getRecordsByModule(req, res);

      // Should NOT have $nin status filter when status=all
      const callArgs = mockRecordsModel.find.mock.calls[0][0];
      expect(callArgs.status).toBeUndefined();
    });
  });

  describe('getAllAutoridadesRecords', () => {
    it('should return paginated autoridades records', async () => {
      const mockRecords = [
        { _id: '1', blNumber: 'BL001', auth: 'APA' },
        { _id: '2', blNumber: 'BL002', auth: 'QUA' },
      ];

      mockRecordsAutoridadesModel.find.mockReturnThis();
      mockRecordsAutoridadesModel.sort.mockReturnThis();
      mockRecordsAutoridadesModel.skip.mockReturnThis();
      mockRecordsAutoridadesModel.limit.mockResolvedValue(mockRecords);
      mockRecordsAutoridadesModel.countDocuments.mockResolvedValue(40);

      const { req, res } = createMockReqRes(
        {},
        { page: '2', limit: '20' }
      );

      await getAllAutoridadesRecords(req as any, res);

      expect(mockRecordsAutoridadesModel.skip).toHaveBeenCalledWith(20); // (2-1) * 20
      expect(mockRecordsAutoridadesModel.limit).toHaveBeenCalledWith(20);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockRecords,
          pagination: expect.objectContaining({
            current: 2,
            pages: 2, // 40 / 20 = 2
            total: 40,
            limit: 20,
          }),
        })
      );
    });

    it('should filter by auth type case-insensitively', async () => {
      mockRecordsAutoridadesModel.find.mockReturnThis();
      mockRecordsAutoridadesModel.sort.mockReturnThis();
      mockRecordsAutoridadesModel.skip.mockReturnThis();
      mockRecordsAutoridadesModel.limit.mockResolvedValue([]);
      mockRecordsAutoridadesModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        {},
        { page: '1', limit: '20', auth: 'apa' }
      );

      await getAllAutoridadesRecords(req as any, res);

      expect(mockRecordsAutoridadesModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: expect.objectContaining({
            $regex: expect.any(RegExp),
          }),
        })
      );
    });

    it('should filter by status when provided', async () => {
      mockRecordsAutoridadesModel.find.mockReturnThis();
      mockRecordsAutoridadesModel.sort.mockReturnThis();
      mockRecordsAutoridadesModel.skip.mockReturnThis();
      mockRecordsAutoridadesModel.limit.mockResolvedValue([]);
      mockRecordsAutoridadesModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        {},
        { page: '1', limit: '20', status: 'pendiente' }
      );

      await getAllAutoridadesRecords(req as any, res);

      expect(mockRecordsAutoridadesModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pendiente',
        })
      );
    });

    it('should handle date range filters', async () => {
      mockRecordsAutoridadesModel.find.mockReturnThis();
      mockRecordsAutoridadesModel.sort.mockReturnThis();
      mockRecordsAutoridadesModel.skip.mockReturnThis();
      mockRecordsAutoridadesModel.limit.mockResolvedValue([]);
      mockRecordsAutoridadesModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        {},
        {
          page: '1',
          limit: '20',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      );

      await getAllAutoridadesRecords(req as any, res);

      expect(mockRecordsAutoridadesModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        })
      );
    });

    it('should return all records when no pagination', async () => {
      const mockRecords = [{ _id: '1' }, { _id: '2' }];

      mockRecordsAutoridadesModel.find.mockReturnThis();
      mockRecordsAutoridadesModel.sort.mockResolvedValue(mockRecords);

      const { req, res } = createMockReqRes({}, {});

      await getAllAutoridadesRecords(req as any, res);

      expect(mockRecordsAutoridadesModel.skip).not.toHaveBeenCalled();
      expect(mockRecordsAutoridadesModel.limit).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockRecords);
    });

    it('should exclude prefacturado/facturado by default', async () => {
      mockRecordsAutoridadesModel.find.mockReturnThis();
      mockRecordsAutoridadesModel.sort.mockReturnThis();
      mockRecordsAutoridadesModel.skip.mockReturnThis();
      mockRecordsAutoridadesModel.limit.mockResolvedValue([]);
      mockRecordsAutoridadesModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        {},
        { page: '1', limit: '20' }
      );

      await getAllAutoridadesRecords(req as any, res);

      // Should exclude prefacturado and facturado by default
      expect(mockRecordsAutoridadesModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $nin: ['prefacturado', 'facturado'] },
        })
      );
    });

    it('should include all statuses when status=all', async () => {
      mockRecordsAutoridadesModel.find.mockReturnThis();
      mockRecordsAutoridadesModel.sort.mockReturnThis();
      mockRecordsAutoridadesModel.skip.mockReturnThis();
      mockRecordsAutoridadesModel.limit.mockResolvedValue([]);
      mockRecordsAutoridadesModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        {},
        { page: '1', limit: '20', status: 'all' }
      );

      await getAllAutoridadesRecords(req as any, res);

      // Should NOT have status filter when status=all
      const callArgs = mockRecordsAutoridadesModel.find.mock.calls[0][0];
      expect(callArgs.status).toBeUndefined();
    });
  });

  describe('getInvoicesByModule', () => {
    it('should return paginated invoices with correct metadata', async () => {
      const mockInvoices = [
        { _id: '1', invoiceNumber: 'TRK-001', module: 'trucking' },
        { _id: '2', invoiceNumber: 'TRK-002', module: 'trucking' },
      ];

      mockInvoicesModel.find.mockReturnThis();
      mockInvoicesModel.sort.mockReturnThis();
      mockInvoicesModel.skip.mockReturnThis();
      mockInvoicesModel.limit.mockResolvedValue(mockInvoices);
      mockInvoicesModel.countDocuments.mockResolvedValue(100);

      const { req, res } = createMockReqRes(
        { module: 'trucking' },
        { page: '1', limit: '50' }
      );

      await getInvoicesByModule(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error).toBe(false);
      expect(jsonCall.payload.success).toBe(true);
      expect(jsonCall.payload.pagination.current).toBe(1);
      expect(jsonCall.payload.pagination.pages).toBe(2); // 100 / 50 = 2
      expect(jsonCall.payload.pagination.total).toBe(100);
    });

    it('should use case-insensitive module matching', async () => {
      mockInvoicesModel.find.mockReturnThis();
      mockInvoicesModel.sort.mockReturnThis();
      mockInvoicesModel.skip.mockReturnThis();
      mockInvoicesModel.limit.mockResolvedValue([]);
      mockInvoicesModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        { module: 'TRUCKING' },
        { page: '1', limit: '50' }
      );

      await getInvoicesByModule(req, res);

      expect(mockInvoicesModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          module: expect.objectContaining({
            $regex: expect.any(RegExp),
          }),
        })
      );

      const callArgs = mockInvoicesModel.find.mock.calls[0][0];
      expect(callArgs.module.$regex.flags).toBe('i');
    });

    it('should filter by AUTH invoices when type=auth', async () => {
      mockInvoicesModel.find.mockReturnThis();
      mockInvoicesModel.sort.mockReturnThis();
      mockInvoicesModel.skip.mockReturnThis();
      mockInvoicesModel.limit.mockResolvedValue([]);
      mockInvoicesModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        { module: 'trucking' },
        { page: '1', limit: '50', type: 'auth' }
      );

      await getInvoicesByModule(req, res);

      expect(mockInvoicesModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceNumber: expect.objectContaining({
            $regex: /^AUTH-/i,
          }),
        })
      );
    });

    it('should filter by normal invoices when type=normal', async () => {
      mockInvoicesModel.find.mockReturnThis();
      mockInvoicesModel.sort.mockReturnThis();
      mockInvoicesModel.skip.mockReturnThis();
      mockInvoicesModel.limit.mockResolvedValue([]);
      mockInvoicesModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        { module: 'trucking' },
        { page: '1', limit: '50', type: 'normal' }
      );

      await getInvoicesByModule(req, res);

      expect(mockInvoicesModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceNumber: expect.objectContaining({
            $not: expect.objectContaining({
              $regex: /^AUTH-/i,
            }),
          }),
        })
      );
    });

    it('should handle search filter', async () => {
      mockInvoicesModel.find.mockReturnThis();
      mockInvoicesModel.sort.mockReturnThis();
      mockInvoicesModel.skip.mockReturnThis();
      mockInvoicesModel.limit.mockResolvedValue([]);
      mockInvoicesModel.countDocuments.mockResolvedValue(0);

      const { req, res } = createMockReqRes(
        { module: 'trucking' },
        { page: '1', limit: '50', search: 'TRK-001' }
      );

      await getInvoicesByModule(req, res);

      expect(mockInvoicesModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ invoiceNumber: expect.any(RegExp) }),
            expect.objectContaining({ clientName: expect.any(RegExp) }),
          ]),
        })
      );
    });
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle page 0 gracefully (default to 1)', async () => {
    mockRecordsModel.find.mockReturnThis();
    mockRecordsModel.populate.mockReturnThis();
    mockRecordsModel.sort.mockReturnThis();
    mockRecordsModel.skip.mockReturnThis();
    mockRecordsModel.limit.mockResolvedValue([]);
    mockRecordsModel.countDocuments.mockResolvedValue(0);

    const { req, res } = createMockReqRes(
      { module: 'trucking' },
      { page: '0', limit: '20' }
    );

    await getRecordsByModule(req, res);

    // Page 0 should be treated as page 1, so skip should be 0
    expect(mockRecordsModel.skip).toHaveBeenCalledWith(0);
  });

  it('should handle invalid limit gracefully', async () => {
    mockRecordsModel.find.mockReturnThis();
    mockRecordsModel.populate.mockReturnThis();
    mockRecordsModel.sort.mockReturnThis();
    mockRecordsModel.skip.mockReturnThis();
    mockRecordsModel.limit.mockResolvedValue([]);
    mockRecordsModel.countDocuments.mockResolvedValue(0);

    const { req, res } = createMockReqRes(
      { module: 'trucking' },
      { page: '1', limit: 'invalid' }
    );

    await getRecordsByModule(req, res);

    // Invalid limit should default to 10
    expect(mockRecordsModel.limit).toHaveBeenCalledWith(10);
  });

  it('should calculate correct skip value for different pages', async () => {
    mockRecordsModel.find.mockReturnThis();
    mockRecordsModel.populate.mockReturnThis();
    mockRecordsModel.sort.mockReturnThis();
    mockRecordsModel.skip.mockReturnThis();
    mockRecordsModel.limit.mockResolvedValue([]);
    mockRecordsModel.countDocuments.mockResolvedValue(100);

    // Test page 3 with limit 25
    const { req, res } = createMockReqRes(
      { module: 'trucking' },
      { page: '3', limit: '25' }
    );

    await getRecordsByModule(req, res);

    // Skip should be (3-1) * 25 = 50
    expect(mockRecordsModel.skip).toHaveBeenCalledWith(50);
    expect(mockRecordsModel.limit).toHaveBeenCalledWith(25);
  });

  it('should return correct total pages calculation', async () => {
    const mockRecords = [{ _id: '1' }];

    mockRecordsModel.find.mockReturnThis();
    mockRecordsModel.populate.mockReturnThis();
    mockRecordsModel.sort.mockReturnThis();
    mockRecordsModel.skip.mockReturnThis();
    mockRecordsModel.limit.mockResolvedValue(mockRecords);
    mockRecordsModel.countDocuments.mockResolvedValue(47);

    const { req, res } = createMockReqRes(
      { module: 'trucking' },
      { page: '1', limit: '20' }
    );

    await getRecordsByModule(req, res);

    // 47 / 20 = 2.35, should ceil to 3 pages
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: expect.objectContaining({
          pages: 3,
          total: 47,
        }),
      })
    );
  });
});
