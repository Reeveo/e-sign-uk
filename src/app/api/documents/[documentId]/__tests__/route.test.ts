import { DELETE } from '../route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Mock the createClient function and its return value
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Documents API', () => {
  // Set up mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE method', () => {
    it('returns 401 if user is not authenticated', async () => {
      // Mock auth.getUser to return no user
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest('http://localhost:3000/api/documents/123', {
        method: 'DELETE',
      });
      const response = await DELETE(req, { params: { documentId: '123' } });
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });

    it('returns 404 if document does not exist', async () => {
      // Mock auth.getUser to return a user
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Document not found' },
        }),
      };
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest('http://localhost:3000/api/documents/123', {
        method: 'DELETE',
      });
      const response = await DELETE(req, { params: { documentId: '123' } });
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Document not found' });
    });

    it('returns 403 if user does not own the document', async () => {
      // Mock auth.getUser to return a user
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'user-456' }, // Different user_id
          error: null,
        }),
      };
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest('http://localhost:3000/api/documents/123', {
        method: 'DELETE',
      });
      const response = await DELETE(req, { params: { documentId: '123' } });
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'Unauthorized to delete this document' });
    });

    it('returns 500 if delete operation fails', async () => {
      // Mock auth.getUser to return a user
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'user-123' }, // Matching user_id
          error: null,
        }),
        // Mock delete operation to fail
        delete_result: {
          error: { message: 'Database error' },
        },
      };
      // Set up the mock to return the error from delete operation
      mockSupabase.delete.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockImplementation((field, value) => {
        if (field === 'id' && value === '123') {
          return mockSupabase.delete_result;
        }
        return mockSupabase;
      });
      
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest('http://localhost:3000/api/documents/123', {
        method: 'DELETE',
      });
      const response = await DELETE(req, { params: { documentId: '123' } });
      
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe('Failed to delete document');
    });

    it('returns 200 if document is successfully deleted', async () => {
      // Mock auth.getUser to return a user
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'user-123' }, // Matching user_id
          error: null,
        }),
      };
      // Successful delete operation
      mockSupabase.delete.mockReturnValue({ 
        eq: jest.fn().mockReturnValue({
          error: null 
        })
      });
      
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest('http://localhost:3000/api/documents/123', {
        method: 'DELETE',
      });
      const response = await DELETE(req, { params: { documentId: '123' } });
      
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ message: 'Document deleted successfully' });
    });
  });
}); 