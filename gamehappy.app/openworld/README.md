# Open World Game - Phase 1 Admin System Documentation

## Overview

Open World is a collaborative text-based world-building game where administrators create structured worlds, and players populate them with their own content within assigned areas.

**Tech Stack:**
- Backend: PHP with MySQL
- Frontend: HTML, CSS, JavaScript
- Database: 8 interconnected tables
- API: RESTful JSON endpoints

## Architecture

### Phase 1: Admin World Creation (CURRENT)
- Admins create worlds
- Admins create places (locations)
- Admins establish directional connections between places
- Admins create objects (items, NPCs, furniture)
- Admins configure mechanics (interactions)

### Phase 2: Player Creation (Planned)
- Players assigned to plots within worlds
- Players create own content within their plot areas
- Players have limited placement and mechanics options

### Phase 3: Exploration (Planned)
- Players navigate text-based world using directional commands
- Players discover and interact with objects
- Players execute mechanics and receive feedback

## Database Schema

### Core Tables

#### ow_worlds
Primary world containers created by admins.
```
- id (PK)
- name VARCHAR(255)
- description TEXT
- created_by (FK users.id)
- created_at TIMESTAMP
- is_public BOOLEAN
```

#### ow_places
Locations/rooms within worlds.
```
- id (PK)
- world_id (FK ow_worlds.id)
- name VARCHAR(255)
- description TEXT
- created_by (FK users.id)
- created_at TIMESTAMP
```

#### ow_place_exits
Directional connections (north, south, east, west, up, down).
```
- id (PK)
- from_place_id (FK ow_places.id)
- to_place_id (FK ow_places.id)
- direction ENUM(6 values)
- UNIQUE(from_place_id, direction) - Ensures one exit per direction
```

#### ow_objects
Objects in places (items, NPCs, furniture).
```
- id (PK)
- place_id (FK ow_places.id)
- name VARCHAR(255)
- description TEXT
- created_by (FK users.id)
- created_at TIMESTAMP
- is_visible BOOLEAN
```

#### ow_mechanics
Interactions available on objects.
```
- id (PK)
- object_id (FK ow_objects.id)
- type ENUM (open, examine, take, use, teleport, create_area, trigger)
- name VARCHAR(255)
- description TEXT
- action_value JSON - Type-specific configuration
- is_active BOOLEAN
```

#### ow_sub_areas
Interior spaces within objects (nested locations).
```
- id (PK)
- object_id (FK ow_objects.id)
- name VARCHAR(255)
- description TEXT
- created_by (FK users.id)
```

#### ow_plot_assignments
Player land allocation within worlds.
```
- id (PK)
- world_id (FK ow_worlds.id)
- player_id (FK users.id)
- assigned_by (FK users.id)
- assigned_at TIMESTAMP
- description VARCHAR(255)
- UNIQUE(world_id, player_id)
```

#### ow_permissions
Role-based access control.
```
- id (PK)
- world_id (FK ow_worlds.id)
- user_id (FK users.id)
- role ENUM (admin, editor, viewer)
- granted_by (FK users.id)
- granted_at TIMESTAMP
```

## API Endpoints

All endpoints POST to: `/gamehappy/api/openworld/api.php`
All require admin authentication via session.

### World Management

**create_world**
```json
{
  "action": "create_world",
  "name": "World Name",
  "description": "Optional description",
  "is_public": 0 or 1
}
Response: { "success": true, "world_id": 123 }
```

**get_worlds**
```json
{
  "action": "get_worlds"
}
Response: {
  "success": true,
  "worlds": [
    {
      "id": 1,
      "name": "Sample World",
      "description": "...",
      "created_at": "2024-01-01T12:00:00",
      "place_count": 5,
      "is_public": 1
    }
  ]
}
```

### Place Management

**create_place**
```json
{
  "action": "create_place",
  "world_id": 123,
  "name": "Place Name",
  "description": "Optional description"
}
Response: { "success": true, "place_id": 456 }
```

**get_places**
```json
{
  "action": "get_places",
  "world_id": 123
}
Response: {
  "success": true,
  "places": [
    {
      "id": 1,
      "world_id": 123,
      "name": "Library",
      "description": "...",
      "created_at": "2024-01-01T12:00:00"
    }
  ]
}
```

**link_places**
```json
{
  "action": "link_places",
  "from_place_id": 1,
  "to_place_id": 2,
  "direction": "north"
}
Response: { "success": true, "message": "Places linked" }
```

Directions: "north", "south", "east", "west", "up", "down"
Constraint: Only one exit per direction per place.

### Object Management

**create_object**
```json
{
  "action": "create_object",
  "place_id": 456,
  "name": "Object Name",
  "description": "Optional description"
}
Response: { "success": true, "object_id": 789 }
```

**get_objects**
```json
{
  "action": "get_objects",
  "place_id": 456
}
Response: {
  "success": true,
  "objects": [
    {
      "id": 1,
      "place_id": 456,
      "name": "Bookshelf",
      "description": "...",
      "created_at": "2024-01-01T12:00:00"
    }
  ]
}
```

### Mechanic Management

**add_mechanic**
```json
{
  "action": "add_mechanic",
  "object_id": 789,
  "type": "open",
  "name": "Open Drawer",
  "description": "Opens the drawer",
  "action_value": "{\"state\": \"open\"}"
}
Response: { "success": true, "message": "Mechanic added" }
```

**Mechanic Types & action_value:**

- **open**: `{"state": "open"}` - Opens/closes container
- **examine**: `{"text": "description"}` - Player reads description
- **take**: `{"item": "item_name"}` - Player picks up item
- **use**: `{"effect": "description"}` - Item usage effect
- **teleport**: `{"destination": place_id}` - Moves player to place
- **create_area**: `{"subarea": "subarea_id"}` - Interior space
- **trigger**: `{"message": "event description"}` - Special event

## UI Components

### Admin Dashboard (`admin.html`)

Three main tabs:

**1. Worlds Tab**
- Create new world form
- List all admin-created worlds with place count
- World metadata (creation date, public/private status)

**2. Places Tab**
- World selector dropdown
- Create place form (appears when world selected)
- Link places form with direction selector
- List places in selected world with edit options

**3. Objects Tab**
- Place selector dropdown (auto-populated from Places tab world)
- Create object form
- List objects with "Add Mechanic" button
- Mechanics modal for configuring interactions

### Mechanics Modal
Dynamically displays type-specific settings:
- **open**: Text field for state name
- **take**: Text field for item name
- **teleport**: Dropdown to select destination place
- **trigger**: Text field for event message
- **examine/use**: Text fields for descriptions

## File Structure

```
openworld/
├── admin.html          - Main admin dashboard UI
├── admin.css           - Styling (dark theme, text-based)
├── admin.js            - Frontend logic, API calls, state management
├── api.php             - Backend API endpoints and handlers
└── database-schema.sql - MySQL table creation script
```

## Authentication & Authorization

- All API endpoints require active session with `$_SESSION['user_id']`
- `isAdmin()` function checks user permissions
- **TODO**: Implement proper admin role check against `ow_permissions` table
- Currently assumes logged-in user is admin (update in `isAdmin()`)

## Text-Based UI Philosophy

Design principles:
- No complex graphics or animations
- Buttons and text inputs only
- Clear, readable typography
- Dark theme for reduced eye strain
- Organized into logical sections with tabs
- Form-based interaction model
- List views for data browsing

## Next Steps (Phase 2)

1. **Create Player Creation Interface**
   - Player-only view for creating content within assigned plots
   - Limited object types available
   - Restricted mechanic options
   - Ownership enforcement

2. **Implement Exploration Interface**
   - Text-based world navigation
   - Directional commands (go north, go up, etc.)
   - Object discovery and interaction
   - Mechanic execution with feedback

3. **Add Inventory System**
   - Pickup/drop item mechanics
   - Inventory display
   - Item properties

4. **Implement NPC System**
   - NPCs as special objects
   - Dialogue mechanics
   - NPC state management

## Development Notes

- All API responses are JSON
- Errors include descriptive messages
- Database queries use prepared statements (SQL injection prevention)
- Foreign key constraints enforce data integrity
- Indexes on foreign keys for performance optimization
- Unique constraint on `(from_place_id, direction)` prevents duplicate exits

## Security Considerations

- ✅ SQL injection prevention via prepared statements
- ✅ CSRF protection via session checking
- ✅ Input validation on all API endpoints
- ⏳ TODO: Rate limiting on API endpoints
- ⏳ TODO: Audit logging for admin actions
- ⏳ TODO: Two-factor authentication for admin accounts
