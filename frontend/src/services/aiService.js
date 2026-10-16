import api from "./api";

const aiService = {
  async assist(documentId, action, prompt = "") {
    if (!documentId) throw new Error("A document is required for AI assistance.");
    const response = await api.post(`/ai/documents/${encodeURIComponent(documentId)}/assist`, { action, prompt });
    const payload = response?.data?.data || response?.data;
    if (!payload || typeof payload.result !== "string") {
      throw new Error(response?.data?.message || "The AI assistant returned an invalid response.");
    }
    return payload;
  },
};

export default aiService;
