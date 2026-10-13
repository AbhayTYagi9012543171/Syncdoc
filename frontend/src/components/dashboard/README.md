# SyncDoc Dashboard Components — Premium Upgrade

This folder contains the upgraded dashboard UI components and `DashboardPremium.css`.

## Files
- `DashboardHeader.jsx` — responsive workspace header and create action.
- `StatsGrid.jsx` — dynamic statistic cards with loading and empty states.
- `ProductivityChart.jsx` — dynamic bar chart with period selector.
- `ActivityFeed.jsx` — recent activity feed with skeleton and empty states.
- `RecentDocuments.jsx` — responsive document table, collaborators, empty/error states.
- `DashboardPremium.css` — shared responsive styles, hover effects, entrance animation and reduced-motion support.

## Integration
Keep the existing imports and props in `src/pages/Dashboard.js`. The existing backend-driven props are preserved. The stylesheet is imported by each dashboard component.

## Dependencies
Uses existing React, React Router, Lucide, and common components from this project. No new dependency is required.
