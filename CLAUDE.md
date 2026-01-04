# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MRI Physics Tool is a clinical MRI physics support application for testing and tracking. It's a Progressive Web App (PWA) with offline-first data storage using IndexedDB.

## Development Commands

```bash
make dev         # Start development server with HMR
make build       # TypeScript compile + Vite production build
make lint        # Run ESLint
make preview     # Preview production build locally
make install     # Install dependencies
make clean       # Remove build artifacts
make deploy      # Build and push to trigger GitHub Actions deploy
make typecheck   # Run TypeScript type checking only
make help        # Show all available targets
```

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **MUI + Radix UI** for components (MUI base, Radix for dialogs/menus)
- **Dexie** for IndexedDB with reactive queries via `useLiveQuery`
- **React Router** for navigation with nested routes
- **Vite PWA Plugin** for offline support

## Architecture

### Data Hierarchy

```
Organization → Site → Room → Equipment → Events → Images
```

- **Organization**: Hospital networks (top level)
- **Site**: Individual hospitals/buildings
- **Room**: Scanner rooms (one MRI scanner per room)
- **Equipment**: MRI scanners, coils, phantoms, workstations
- **Events**: Service events (ACR tests, QC checks, repairs, etc.)
- **Images**: Photos linked to events/equipment/rooms

### Key Directories

- `src/pages/` - Page components (one per route)
- `src/db/index.ts` - Dexie database schema and helper functions
- `src/types/index.ts` - TypeScript interfaces for all entities

### Database Patterns

All data access uses Dexie with reactive hooks:

```typescript
// Reactive query - UI auto-updates when data changes
const items = useLiveQuery(() => db.rooms.orderBy('name').toArray());

// Filtered query with dependency
const equipment = useLiveQuery(
  () => roomId
    ? db.equipment.where('roomId').equals(roomId).toArray()
    : Promise.resolve([]),
  [roomId]
);
```

Helper functions in `src/db/index.ts`:
- `getOrganizationWithSites()`, `getSiteWithRooms()`, `getRoomWithEquipment()`
- `getEquipmentWithEvents()`, `getEventWithImages()`, `getImagesForTimeline()`

### Page Component Pattern

Pages follow a consistent CRUD pattern:
1. State for dialog open/close, form data, editing ID
2. `useLiveQuery` for data fetching
3. Handlers for open, close, save, delete
4. Grid of cards with edit/delete actions
5. Dialog for add/edit form
6. Confirmation dialog for delete

### URL Routes

Nested routes for drill-down navigation:
- `/` - Organizations list
- `/organizations/:orgId/sites` - Sites for an organization
- `/organizations/:orgId/sites/:siteId/rooms` - Rooms for a site
- `/events` - Events list
- `/export` - Data export

### Form Data Types

Each entity has a corresponding form type that omits auto-generated fields:

```typescript
type RoomFormData = Omit<Room, 'id' | 'createdAt' | 'updatedAt'>;
```

## PWA Configuration

- Base path: `/mri-physics-tool/` (for GitHub Pages)
- Router uses `basename="/mri-physics-tool"`
- Service worker caches fonts and assets for offline use

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via GitHub Actions.
