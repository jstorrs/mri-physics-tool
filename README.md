# MRI Physics Tool

A clinical MRI physics support application for testing and tracking. Built as a Progressive Web App (PWA) with offline-first data storage.

## Features

- **Hierarchical Organization**: Manage organizations, sites, locations, and equipment
- **Service Event Tracking**: Log ACR tests, QC checks, repairs, and other service events
- **Image Gallery**: Attach photos to events, equipment, and locations
- **Offline Support**: Full functionality without internet connection using IndexedDB
- **Drill-Down Navigation**: Quick access to locations with browser back/forward support

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
- **Material-UI (MUI)** for components and theming
- **Dexie** for IndexedDB with reactive queries
- **React Router** for navigation
- **Vite PWA Plugin** for offline support

## Data Model

```
Organization → Site → Location → Equipment → Events → Images
```

- **Organization**: Hospital networks (top level)
- **Site**: Individual hospitals/buildings
- **Location**: Scanner rooms (one MRI scanner per location)
- **Equipment**: MRI scanners, coils, phantoms, workstations
- **Events**: Service events (ACR tests, QC checks, repairs, etc.)
- **Images**: Photos linked to events/equipment/locations

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via GitHub Actions.
