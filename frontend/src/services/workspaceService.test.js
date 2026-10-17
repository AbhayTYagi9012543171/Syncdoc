import { unwrapWorkspaceResponse } from "./workspaceService";

describe("unwrapWorkspaceResponse", () => {
  test("normalizes a direct Mongo workspace", () => {
    const result = unwrapWorkspaceResponse({ _id: "abc123", name: "Engineering" });
    expect(result).toMatchObject({
      _id: "abc123",
      id: "abc123",
      workspaceId: "abc123",
      name: "Engineering",
    });
  });

  test("unwraps nested API envelopes", () => {
    const result = unwrapWorkspaceResponse({
      success: true,
      data: {
        success: true,
        data: { workspace: { id: "workspace-7", name: "Research" } },
      },
    });
    expect(result).toMatchObject({
      id: "workspace-7",
      _id: "workspace-7",
      workspaceId: "workspace-7",
      name: "Research",
    });
  });

  test("rejects malformed payloads instead of returning wrapper objects", () => {
    expect(unwrapWorkspaceResponse({ success: true, message: "Created" })).toBeNull();
    expect(unwrapWorkspaceResponse(null)).toBeNull();
    expect(unwrapWorkspaceResponse([])).toBeNull();
  });
});
