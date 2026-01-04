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

## Testing on Mobile Devices

Camera access and PWA features require a "secure context" (HTTPS or localhost). To test on a physical Android device during development:

### Chrome USB Port Forwarding (Recommended)

This makes your phone access `localhost` through a USB tunnel to your dev machine:

1. **On your phone**: Settings → Developer options → Enable USB debugging
2. **Connect phone to computer via USB**
3. **Start the dev server**: `make dev`
4. **On desktop Chrome**: Navigate to `chrome://inspect#devices`
5. **Enable port forwarding**: Click "Port forwarding", add rule: `5173` → `localhost:5173`
6. **On phone Chrome**: Visit `http://localhost:5173/mri-physics-tool`

Your phone now treats the connection as localhost, enabling camera access and service worker registration without HTTPS certificates.

### Alternative: ngrok

For quick testing without USB:

```bash
npx ngrok http 5173
# Opens an https://xxx.ngrok.io URL you can access from any device
```

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via GitHub Actions.
