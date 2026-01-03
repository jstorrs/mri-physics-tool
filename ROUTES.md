# MRI Physics Tool - Route Specification

## Global Navigation

**Side Drawer Menu** (visible on desktop, hamburger on mobile):
- Home (`/`)
- Events (`/events`)
- Export (`/export`)

*Note: Organizations, Sites, and Locations are NOT in the nav drawer — they're only accessible via the Dashboard drill-down or direct URL.*

---

## Route: `/` 

**Purpose:** Select or manage organizations. Top level of drill down menu to select organizations/site/room/equipment

**Data Displayed:**
- Settings style drill down menu
  - Header
	- Left: No back arrow
	- Middle: Label = "Organizations"
  - Items
	- Alphabetical list of Organization Short Names
	- Last item is "Add Organization"

**User Actions:**
- Touch item → go to `/organizations/<orginization-id>/sites`
- Long press item → context menu
    - Edit → opens dialog with existing data
	- Export → opens export dialog for organization data
    - Delete → confirmation dialog (warns about cascading delete)
- Touch "Add Organization" → opens dialog

**Navigation:**
- "back" behavior: confirm before exiting app
- Reached by navigating "back" from /sites

---

## Route: `/organizations/<orginization-id>/sites`

**Purpose:** Select or manage organization sites (hospitals/buildings)

**Data Displayed:**
- Settings style drill down menu
  - Header
	- Left: Back arrow '<'
	- Middle: Organization Short Name
  - Items
	- Alphabetical list of site names
	- Last item in "Add Site"

**User Actions:**
- Touch item → go to `/organizations/<orginization-id>/sites/<site-id>/rooms`
- Long press item → context menu
    - Edit → opens dialog with existing data
	- Export → opens export dialog for site data
    - Delete → confirmation dialog (warns about cascading delete)
- Touch "Add Site" → opens dialog

**Navigation:**
- Touch "back arrow" → navigate to '/'
- "back" behavior → navigate to '/'
- Reached from: item in '/' or `/organizations/<orginization-id>/sites/<site-id>/rooms`

---

---

## Route: `/organizations/<orginization-id>/sites/<site-id>/rooms`

**Purpose:** Select or manage organization site rooms

**Data Displayed:**
- Settings style drill down menu
  - Header
	- Left: Back arrow '<'
	- Middle: Room Name
  - Items
	- Alphabetical list of site rooms
	- Last item in "Add Room"

**User Actions:**
- Touch item → go to `/<organization-id>/<site-id>/rooms/<room-id>`
- Long press item → context menu
    - Edit → opens dialog with existing data
	- Export → opens export dialog for site data
    - Delete → confirmation dialog (warns about cascading delete)
- Touch "Add Room" → opens dialog

**Navigation:**
- Touch "back arrow" → navigate to `/organizations/<orginization-id>/sites`
- "back" behavior → navigate to `/organizations/<orginization-id>/sites`
- Reached from: item in `/organizations/<orginization-id>/sites` or `/organizations/<orginization-id>/sites/<site-id>/rooms/<room-id>`

---
