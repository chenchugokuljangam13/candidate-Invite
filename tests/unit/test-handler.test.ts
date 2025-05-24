import { lambdaHandler } from '../../functions/app'; // Replace with actual filename
import * as supabaseHelper from '../../functions/utils/supabasehelper';
import * as sesHelper from '../../functions/utils/sesHelper';
import * as templates from '../../functions/utils/emails-templates/templates';

jest.mock('../../functions/utils/supabasehelper');
jest.mock('../../functions/utils/sesHelper');
jest.mock('../../functions/utils/emails-templates/templates');

describe('lambdaHandler', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, SUPABASE_URL: 'test-url', SUPABASE_KEY: 'test-key' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn(),
  };

  it('should return 400 if required fields are missing', async () => {
    const result = await lambdaHandler({ body: '{}' } as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toMatch(/Missing/);
  });

  it('should return 500 if candidate insert fails', async () => {
    (supabaseHelper.supabaseInit as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.select.mockResolvedValueOnce({ data: null, error: 'Insert error' });

    const event = {
      body: JSON.stringify({
        candidateName: 'John',
        candidateEmail: 'john@example.com',
        url: 'http://test.com',
      }),
    };

    const result = await lambdaHandler(event as any);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('some error happened');
  });

  it('should return 500 if assessment insert fails', async () => {
    (supabaseHelper.supabaseInit as jest.Mock).mockReturnValue(mockSupabase);

    mockSupabase.select
      .mockResolvedValueOnce({ data: [{ id: 1 }], error: null }) // candidate insert
      .mockResolvedValueOnce({ data: null, error: 'Assessment error' }); // assessment insert

    const event = {
      body: JSON.stringify({
        candidateName: 'John',
        candidateEmail: 'john@example.com',
        url: 'http://test.com',
      }),
    };

    const result = await lambdaHandler(event as any);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('some error happened');
  });

  it('should return 500 if SES email send fails', async () => {
    (supabaseHelper.supabaseInit as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.select
      .mockResolvedValueOnce({ data: [{ id: 1 }], error: null })
      .mockResolvedValueOnce({ data: [{ id: 10 }], error: null });

    (templates.emailTemplate as any) = {
      sendAssignment: jest.fn().mockReturnValue('<html>Email</html>'),
    };
    (sesHelper.sendEmailBySES as jest.Mock).mockRejectedValue(new Error('SES error'));

    const event = {
      body: JSON.stringify({
        candidateName: 'John',
        candidateEmail: 'john@example.com',
        url: 'http://test.com',
      }),
    };

    const result = await lambdaHandler(event as any);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Assignment email not sent');
  });

  it('should return 200 on success', async () => {
    (supabaseHelper.supabaseInit as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.select
      .mockResolvedValueOnce({ data: [{ id: 1 }], error: null })
      .mockResolvedValueOnce({ data: [{ id: 10 }], error: null });

    (templates.emailTemplate as any) = {
      sendAssignment: jest.fn().mockReturnValue('<html>Email</html>'),
    };
    (sesHelper.sendEmailBySES as jest.Mock).mockResolvedValue({});

    const event = {
      body: JSON.stringify({
        candidateName: 'John',
        candidateEmail: 'john@example.com',
        url: 'http://test.com',
      }),
    };

    const result = await lambdaHandler(event as any);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Assignment email sent successfully');
  });
});
