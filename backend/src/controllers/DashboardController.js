
const mongoose = require("mongoose");
const Document = require("../models/Document");
const Workspace = require("../models/Workspace");
const { logger } = require("../config/logger");

function toId(value) {
  return new mongoose.Types.ObjectId(String(value));
}

function percentageChange(current, previous) {
  if (!previous) {
    return current > 0 ? "+100%" : "0%";
  }

  const value = Math.round(((current - previous) / previous) * 100);

  return `${value >= 0 ? "+" : ""}${value}%`;
}

function getAccessibleDocumentQuery(userId) {
  return {
    deletedAt: null,
    $or: [
      { owner: userId },
      { "collaborators.user": userId },
    ],
  };
}

const DashboardController = {
  async get(req, res, next) {
    try {
      const userId = toId(req.user.id);
      const now = new Date();

      // Statistics compare the latest 30 days with the previous 30 days.
      const currentStart = new Date(now);
      currentStart.setDate(currentStart.getDate() - 30);

      const previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 30);

      // Build UTC calendar boundaries for the seven-day activity chart.
      const activityToday = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate()
        )
      );

      const activityStart = new Date(activityToday);
      activityStart.setUTCDate(activityStart.getUTCDate() - 6);

      const documentQuery = getAccessibleDocumentQuery(userId);

      const [
        documentCount,
        sharedWithMe,
        workspaceCount,
        documentsCreatedCurrent,
        documentsCreatedPrevious,
        workspacesCreatedCurrent,
        workspacesCreatedPrevious,
        sharedUpdatedCurrent,
        sharedUpdatedPrevious,
        collaboratorRows,
        activityRows,
        productivityRows,
        creationRows,
        recentCreatedDocuments,
        recentDocuments,
      ] = await Promise.all([
        Document.countDocuments(documentQuery),

        Document.countDocuments({
          deletedAt: null,
          owner: { $ne: userId },
          "collaborators.user": userId,
        }),

        Workspace.countDocuments({
          deletedAt: null,
          $or: [
            { owner: userId },
            { "members.user": userId },
          ],
        }),

        Document.countDocuments({
          ...documentQuery,
          createdAt: { $gte: currentStart, $lte: now },
        }),

        Document.countDocuments({
          ...documentQuery,
          createdAt: {
            $gte: previousStart,
            $lt: currentStart,
          },
        }),

        Workspace.countDocuments({
          deletedAt: null,
          $or: [
            { owner: userId },
            { "members.user": userId },
          ],
          createdAt: { $gte: currentStart, $lte: now },
        }),

        Workspace.countDocuments({
          deletedAt: null,
          $or: [
            { owner: userId },
            { "members.user": userId },
          ],
          createdAt: {
            $gte: previousStart,
            $lt: currentStart,
          },
        }),

        Document.countDocuments({
          deletedAt: null,
          owner: { $ne: userId },
          "collaborators.user": userId,
          updatedAt: { $gte: currentStart, $lte: now },
        }),

        Document.countDocuments({
          deletedAt: null,
          owner: { $ne: userId },
          "collaborators.user": userId,
          updatedAt: {
            $gte: previousStart,
            $lt: currentStart,
          },
        }),

        // Count unique collaborators across accessible documents.
        Document.aggregate([
          { $match: documentQuery },
          { $unwind: "$collaborators" },
          {
            $match: {
              "collaborators.user": { $ne: userId },
            },
          },
          {
            $group: {
              _id: "$collaborators.user",
            },
          },
          { $count: "total" },
        ]),

        // Retrieve recent edit operations from the last seven days.
        Document.aggregate([
          { $match: documentQuery },
          { $unwind: "$operations" },
          {
            $match: {
              "operations.timestamp": {
                $gte: activityStart,
                $lte: now,
              },
            },
          },
          { $sort: { "operations.timestamp": -1 } },
          { $limit: 12 },
          {
            $lookup: {
              from: "users",
              localField: "operations.userId",
              foreignField: "_id",
              as: "operationUser",
            },
          },
          {
            $unwind: {
              path: "$operationUser",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 1,
              title: 1,
              operation: "$operations",
              user: {
                _id: "$operationUser._id",
                username: "$operationUser.username",
                displayName: "$operationUser.displayName",
                avatar: "$operationUser.avatar",
              },
            },
          },
        ]),

        // Count edit operations by UTC day for the productivity chart.
        Document.aggregate([
          { $match: documentQuery },
          { $unwind: "$operations" },
          {
            $match: {
              "operations.timestamp": {
                $gte: activityStart,
                $lte: now,
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$operations.timestamp",
                  timezone: "UTC",
                },
              },
              value: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // Count documents created by day, separately from edit operations.
        Document.aggregate([
          {
            $match: {
              ...documentQuery,
              createdAt: {
                $gte: activityStart,
                $lte: now,
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "UTC",
                },
              },
              value: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // Document creation is activity, even if no edit has happened yet.
        Document.find({
          ...documentQuery,
          createdAt: {
            $gte: activityStart,
            $lte: now,
          },
        })
          .populate("owner", "username displayName avatar")
          .sort({ createdAt: -1 })
          .limit(12)
          .lean(),

        Document.find(documentQuery)
          .populate("owner", "username displayName avatar")
          .populate(
            "collaborators.user",
            "username displayName avatar"
          )
          .sort({ updatedAt: -1 })
          .limit(5)
          .lean(),
      ]);

      const collaboratorCount = collaboratorRows[0]?.total || 0;

      const operationActivity = activityRows.map((item) => ({
        id: `${item._id}-${
          item.operation?.timestamp?.toISOString?.() || Date.now()
        }`,
        documentId: String(item._id),
        documentTitle: item.title || "Untitled document",
        name:
          item.user?.displayName ||
          item.user?.username ||
          "Unknown user",
        user: item.user || null,
        action: `${item.operation?.type || "updated"} ${
          item.title || "a document"
        }`,
        type: item.operation?.type || "update",
        createdAt: item.operation?.timestamp || null,
      }));

      const creationActivity = recentCreatedDocuments.map((item) => ({
        id: `${item._id}-created`,
        documentId: String(item._id),
        documentTitle: item.title || "Untitled document",
        name:
          item.owner?.displayName ||
          item.owner?.username ||
          "Unknown user",
        user: item.owner || null,
        action: `created ${item.title || "a document"}`,
        type: "created",
        createdAt: item.createdAt || null,
      }));

      // Merge both sources so new documents appear without an edit.
      const activity = [
        ...operationActivity,
        ...creationActivity,
      ]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
        )
        .slice(0, 12);

      // Always return seven entries, including days with zero activity.
      const days = [];

      for (let i = 6; i >= 0; i -= 1) {
        const date = new Date(activityToday);
        date.setUTCDate(date.getUTCDate() - i);
        days.push(date);
      }

      const productivity = days.map((date) => {
        const key = date.toISOString().slice(0, 10);

        const editRow = productivityRows.find(
          (item) => item._id === key
        );

        const createdRow = creationRows.find(
          (item) => item._id === key
        );

        return {
          id: key,
          label: date.toLocaleDateString("en-US", {
            weekday: "short",
            timeZone: "UTC",
          }),
          date: key,
          value:
            (editRow?.value || 0) +
            (createdRow?.value || 0),
        };
      });

      const stats = [
        {
          id: "documents",
          label: "Documents",
          value: documentCount,
          change: percentageChange(
            documentsCreatedCurrent,
            documentsCreatedPrevious
          ),
          description: "Accessible documents",
          icon: "documents",
        },
        {
          id: "shared",
          label: "Shared with me",
          value: sharedWithMe,
          change: percentageChange(
            sharedUpdatedCurrent,
            sharedUpdatedPrevious
          ),
          description: "Documents shared by others",
          icon: "shared",
        },
        {
          id: "projects",
          label: "Projects",
          value: workspaceCount,
          change: percentageChange(
            workspacesCreatedCurrent,
            workspacesCreatedPrevious
          ),
          description: "Your accessible workspaces",
          icon: "projects",
        },
        {
          id: "collaborators",
          label: "Collaborators",
          value: collaboratorCount,
          change: "",
          description: "Unique collaborators",
          icon: "collaborators",
        },
      ];

      return res.status(200).json({
        success: true,
        data: {
          generatedAt: now,
          stats,
          productivity: {
            "7": productivity,
          },
          activity,
          recentDocuments,
        },
      });
    } catch (error) {
      logger.error("Dashboard error:", error);
      return next(error);
    }
  },
};

module.exports = DashboardController;
