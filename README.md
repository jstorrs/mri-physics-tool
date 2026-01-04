# MRI Physics Tool

A clinical MRI physics support application for testing and tracking. Built as a Progressive Web App (PWA) with offline-first data storage.

## Features

- **Hierarchical Organization**: Manage organizations, sites, rooms, and equipment
- **Service Event Tracking**: Log ACR tests, QC checks, repairs, and other service events
- **Image Gallery**: Attach photos to events, equipment, and rooms
- **Offline Support**: Full functionality without internet connection using IndexedDB
- **Drill-Down Navigation**: Nested routes with browser back/forward support

## Getting Started

```bash
# Install dependencies
make install

# Start development server
make dev

# Build for production
make build
```

## Development Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start development server with HMR |
| `make build` | TypeScript compile + Vite production build |
| `make lint` | Run ESLint |
| `make typecheck` | Run TypeScript type checking |
| `make preview` | Preview production build locally |
| `make clean` | Remove build artifacts |
| `make deploy` | Build and push to trigger GitHub Actions deploy |

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **MUI + Radix UI** for components (MUI base components, Radix for dialogs/menus)
- **Dexie** for IndexedDB with reactive queries
- **React Router** for navigation with nested routes
- **Vite PWA Plugin** for offline support

## Data Model

```
Organization → Site → Room → Equipment → Events → Images
```

- **Organization**: Hospital networks (top level)
- **Site**: Individual hospitals/buildings
- **Room**: Scanner rooms (one MRI scanner per room)
- **Equipment**: MRI scanners, coils, phantoms, workstations
- **Events**: Service events (ACR tests, QC checks, repairs, etc.)
- **Images**: Photos linked to events/equipment/rooms

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via GitHub Actions.
