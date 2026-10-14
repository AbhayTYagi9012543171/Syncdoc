/** Consistent document shape helpers. These do not mutate API responses. */
export function getDocumentId(document) {
  const id = document?._id ?? document?.id ?? document?.documentId ?? document?.uuid;
  return id === null || id === undefined ? "" : String(id).trim();
}

export function getDocumentTitle(document, fallback = "Untitled document") {
  const candidates = [document?.title, document?.name, document?.documentTitle];
  return candidates.find((value) => typeof value === "string" && value.trim())?.trim() || fallback;
}

export function getDocumentUpdatedAt(document) {
  return document?.updatedAt ?? document?.updated_at ?? document?.modifiedAt ?? document?.modified ?? document?.createdAt ?? document?.created_at ?? null;
}

export function getDocumentOwnerId(document) {
  const owner = document?.owner ?? document?.createdBy ?? document?.user ?? document?.userid;
  if (owner && typeof owner === "object") return String(owner._id ?? owner.id ?? "");
  return owner === null || owner === undefined ? "" : String(owner);
}

export function isDocumentStarred(document) {
  return document?.starred === true || document?.isStarred === true || document?.favorite === true;
}

export function isDocumentArchived(document) {
  return document?.archived === true || document?.isArchived === true;
}

export function isDocumentTrashed(document) {
  return document?.trashed === true || document?.isTrashed === true || document?.deleted === true;
}

export function normalizeDocument(document) {
  if (!document || typeof document !== "object") return null;
  return {
    ...document,
    id: getDocumentId(document),
    title: getDocumentTitle(document),
    updatedAt: getDocumentUpdatedAt(document),
    starred: isDocumentStarred(document),
    archived: isDocumentArchived(document),
    trashed: isDocumentTrashed(document),
  };
}

export default { getDocumentId, getDocumentTitle, getDocumentUpdatedAt, getDocumentOwnerId, isDocumentStarred, isDocumentArchived, isDocumentTrashed, normalizeDocument };

