jest.mock('../models/Workspace', () => {
  const MockWorkspace = jest.fn().mockImplementation(function MockWorkspace(data) {
    Object.assign(this, data);
    this._id = 'workspace-123';
    this.save = jest.fn().mockResolvedValue(undefined);
    this.toObject = jest.fn(() => ({
      ...data,
      _id: 'workspace-123',
      id: 'workspace-123',
      name: data.name,
    }));
  });
  MockWorkspace.exists = jest.fn();
  return MockWorkspace;
});

jest.mock('../models/Document', () => ({}));
jest.mock('../models/User', () => ({}));
jest.mock('../config/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const Workspace = require('../models/Workspace');
const WorkspaceController = require('./WorkspaceController');

function makeResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('WorkspaceController.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Workspace.exists.mockResolvedValue(null);
  });

  test('returns a normalized workspace with stable identifier aliases', async () => {
    const req = {
      body: { name: '  Research Team  ', description: ' Planning space ', settings: { allowPublicAccess: true, defaultDocumentPermissions: 'editor', isOwner: true } },
      user: { id: 'user-456' },
    };
    const res = makeResponse();
    const next = jest.fn();

    await WorkspaceController.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.id).toBe('workspace-123');
    expect(payload.data._id).toBe('workspace-123');
    expect(payload.data.workspaceId).toBe('workspace-123');
    expect(payload.data.memberCount).toBe(1);
    expect(payload.data.name).toBe('Research Team');
    expect(payload.data.description).toBe('Planning space');
    expect(payload.data.settings).toEqual({ allowPublicAccess: true, defaultDocumentPermissions: 'editor' });
    expect(Workspace).toHaveBeenCalledWith(expect.objectContaining({
      members: [{ user: 'user-456', role: 'admin' }],
      memberCount: 1,
      settings: { allowPublicAccess: true, defaultDocumentPermissions: 'editor' },
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an empty workspace name without creating a record', async () => {
    const req = { body: { name: '   ' }, user: { id: 'user-456' } };
    const res = makeResponse();
    const next = jest.fn();

    await WorkspaceController.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].success).toBe(false);
    expect(Workspace).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
