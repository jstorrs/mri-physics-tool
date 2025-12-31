# MRI Physics Tool - Route Specification

## Global Navigation

**Side Drawer Menu** (visible on desktop, hamburger on mobile):
- Home (`/`)
- Equipment (`/equipment`)
- Events (`/events`)
- Gallery (`/gallery`)
- Export (`/export`)

*Note: Organizations, Sites, and Locations are NOT in the nav drawer — they're only accessible via the Dashboard drill-down or direct URL.*

---

## Route: `/` (Dashboard)

**Purpose:** Drill-down navigation through the organization hierarchy

**Data Displayed:**
- Breadcrumb showing current path (Organizations > [Org Name] > [Site Name] > [Location Name])
- Depending on drill-down level:
  - **No selection**: List of all organizations
  - **Org selected**: List of sites in that organization
  - **Site selected**: List of locations at that site
  - **Location selected**: Quick action cards (View Equipment, View Events, New Event, Take Photo)

**URL Parameters:**
- `?org=<id>` — drilled into an organization
- `?org=<id>&site=<id>` — drilled into a site
- `?org=<id>&site=<id>&location=<id>` — drilled into a location

**User Actions:**
- Click item → drill down to next level
- Right-click/long-press item → context menu (Edit, Delete)
- "Add new..." button at bottom of each list
- Quick action cards navigate to `/equipment?location=...`, `/events?location=...`, etc.

**Navigation:**
- Breadcrumb links navigate back up the hierarchy
- Quick actions navigate to other pages with location filter applied

---

## Route: `/organizations`

**Purpose:** Standalone page to manage all organizations

**Data Displayed:**
- Grid of organization cards showing:
  - Organization name
  - Contact name/email
  - Count of sites (chip that links to `/sites?organization=<id>`)

**User Actions:**
- Add Organization → opens dialog
- Edit (icon) → opens dialog with existing data
- Delete (icon) → confirmation dialog (warns about cascading delete)
- Click site count chip → navigates to `/sites?organization=<id>`

**Navigation:**
- Reached from: direct URL only (not in nav menu)
- No automatic "back" behavior

---

## Route: `/sites`

**Purpose:** Manage sites (hospitals/buildings)

**Data Displayed:**
- Filter chip if `?organization=` param present
- Grid of site cards showing:
  - Site name
  - Parent organization name
  - Address
  - Contact info
  - Location count chip → links to `/locations?site=<id>`

**URL Parameters:**
- `?organization=<id>` — filter to show only sites for that org

**User Actions:**
- Add Site → dialog (org pre-selected if filtered)
- Edit/Delete site
- Clear filter chip
- Click location count → navigate to `/locations?site=<id>`

**Navigation:**
- Reached from: `/organizations` (via site count chip)

---

## Route: `/locations`

**Purpose:** Manage locations (scanner rooms)

**Data Displayed:**
- Filter chip if `?site=` param present
- Grid of location cards showing:
  - Location name
  - Org > Site breadcrumb
  - Address
  - Equipment count chip → links to `/equipment?location=<id>`

**URL Parameters:**
- `?site=<id>` — filter to show only locations for that site

**User Actions:**
- Add Location → dialog (site pre-selected if filtered)
- Edit/Delete location
- Clear filter chip
- Click equipment count → navigate to `/equipment?location=<id>`

---

## Route: `/equipment`

**Purpose:** Manage MRI scanners, coils, phantoms, workstations

**Data Displayed:**
- Filter chip if `?location=` param present
- Grid of equipment cards showing:
  - Name, manufacturer, model
  - Equipment type chip (MRI Scanner, Coil, Phantom, etc.)
  - Status chip (Active/Inactive/Decommissioned)
  - Field strength (if MRI)
  - Location name
  - Serial number
  - Event count chip → links to `/events?equipment=<id>`

**URL Parameters:**
- `?location=<id>` — filter to equipment at that location

**User Actions:**
- Add Equipment → dialog (location pre-selected if filtered)
- Edit/Delete equipment
- Click event count → navigate to `/events?equipment=<id>`

---

## Route: `/events`

**Purpose:** Manage service events (ACR tests, QC checks, repairs, etc.)

**Data Displayed:**
- Filter chip if `?equipment=` param present
- Status tabs: All | Scheduled | In Progress | Completed
- Grid of event cards showing:
  - Event type chip (ACR Test, QC Check, etc.)
  - Status chip (color-coded)
  - Title
  - Equipment name
  - Location name
  - Scheduled date
  - Photo count chip → links to `/gallery?event=<id>`

**URL Parameters:**
- `?equipment=<id>` — filter to events for that equipment
- `?location=<id>` — (accepted by Dashboard quick action, but not implemented in filter)
- `?action=new` — (accepted but not implemented)

**User Actions:**
- Add Event → dialog
- Start Event (play icon) → changes status to "in_progress"
- Complete Event (check icon) → changes status to "completed"
- Edit/Delete event
- Camera icon → navigate to `/gallery?event=<id>`
- Photo count chip → navigate to `/gallery?event=<id>`

---

## Route: `/gallery`

**Purpose:** Capture and manage photos

**Data Displayed:**
- Filter chip if `?event=` param present
- Event selector dropdown (for associating new photos)
- Image grid with thumbnails
- Each image shows: caption or timestamp, event name

**URL Parameters:**
- `?event=<id>` — filter to photos for that event

**User Actions:**
- Camera button → opens camera dialog
- Upload button → file picker for multiple images
- Click image → opens full-size viewer with caption editing
- Delete image (in viewer or via icon overlay)

---

## Route: `/export`

**Purpose:** Export data and manage database

**Data Displayed:**
- Export options: format (JSON/CSV), scope, date range, include images toggle
- Data summary counts
- Danger zone: Clear All Data button

**User Actions:**
- Select export options
- Export Data → downloads file(s)
- Clear All Data → double confirmation, then wipes database

---

## Architecture Notes

**Current observations:**
1. **Hybrid navigation** — Dashboard uses hierarchical drill-down, but other pages use flat navigation with query param filters
2. **Hidden pages** — Organizations/Sites/Locations aren't in the nav menu; users must know to go through Dashboard
3. **Inconsistent filtering** — Some pages accept filters that don't work (e.g., `/events?location=` is accepted but not used)
4. **No detail pages** — Everything uses dialogs for viewing/editing; no dedicated `/equipment/:id` detail views
