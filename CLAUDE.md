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
- **Material-UI (MUI)** for components and theming
- **Dexie** for IndexedDB with reactive queries via `useLiveQuery`
- **React Router** for navigation
- **Vite PWA Plugin** for offline support

## Architecture

### Data Hierarchy

```
Organization → Site → Location → Equipment → Events → Images
```

- **Organization**: Hospital networks (top level)
- **Site**: Individual hospitals/buildings
- **Location**: Scanner rooms (one MRI scanner per location)
- **Equipment**: MRI scanners, coils, phantoms, workstations
- **Events**: Service events (ACR tests, QC checks, repairs, etc.)
- **Images**: Photos linked to events/equipment/locations

### Key Directories

- `src/pages/` - Page components (one per route)
- `src/components/layout/` - AppLayout with navigation drawer
- `src/db/index.ts` - Dexie database schema and helper functions
- `src/types/index.ts` - TypeScript interfaces for all entities

### Database Patterns

All data access uses Dexie with reactive hooks:

```typescript
// Reactive query - UI auto-updates when data changes
const items = useLiveQuery(() => db.locations.orderBy('name').toArray());

// Filtered query with dependency
const equipment = useLiveQuery(
  () => locationId
    ? db.equipment.where('locationId').equals(locationId).toArray()
    : Promise.resolve([]),
  [locationId]
);
```

Helper functions in `src/db/index.ts`:
- `getOrganizationWithSites()`, `getSiteWithLocations()`, `getLocationWithEquipment()`
- `getEquipmentWithEvents()`, `getEventWithImages()`, `getImagesForTimeline()`

### Page Component Pattern

Pages follow a consistent CRUD pattern:
1. State for dialog open/close, form data, editing ID
2. `useLiveQuery` for data fetching
3. Handlers for open, close, save, delete
4. Grid of cards with edit/delete actions
5. Dialog for add/edit form
6. Confirmation dialog for delete

### URL Query Parameters

Pages accept filter parameters:
- `/sites?organization=<id>` - Filter sites by organization
- `/locations?site=<id>` - Filter locations by site
- `/equipment?location=<id>` - Filter equipment by location
- `/events?equipment=<id>` - Filter events by equipment
- `/gallery?event=<id>` - Filter images by event

### Form Data Types

Each entity has a corresponding form type that omits auto-generated fields:

```typescript
type LocationFormData = Omit<Location, 'id' | 'createdAt' | 'updatedAt'>;
```

## PWA Configuration

- Base path: `/mri-physics-tool/` (for GitHub Pages)
- Router uses `basename="/mri-physics-tool"`
- Service worker caches fonts and assets for offline use

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via GitHub Actions.
