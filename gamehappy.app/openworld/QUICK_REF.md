# Open World Game - Developer Quick Reference

## Project Overview

**Type:** Collaborative text-based world-building game
**Architecture:** PHP backend + MySQL database + JavaScript frontend
**Current Phase:** Phase 1 - Admin World Creation
**UI Style:** Dark theme, text and buttons only, no graphics

## Quick Start for Developers

### Access Points

| Resource | URL | Purpose |
|----------|-----|---------|
| Admin Dashboard | `/gamehappy/gamehappy.app/openworld/admin.html` | Create worlds/places/objects |
| API Endpoint | `/gamehappy/gamehappy.app/openworld/api.php` | All backend operations |
| Database Schema | `openworld/database-schema.sql` | Table definitions |

### API Quick Reference

All POST requests to `api.php`. All return JSON.

```javascript
// Create world
{action: "create_world", name: "...", description: "...", is_public: 1}

// Get worlds
{action: "get_worlds"}

// Create place
{action: "create_place", world_id: 123, name: "...", description: "..."}

// Get places
{action: "get_places", world_id: 123}

// Link places
{action: "link_places", from_place_id: 1, to_place_id: 2, direction: "north"}

// Create object
{action: "create_object", place_id: 456, name: "...", description: "..."}

// Get objects
{action: "get_objects", place_id: 456}

// Add mechanic
{action: "add_mechanic", object_id: 789, type: "open", name: "...", description: "...", action_value: "{}"}
```

### Mechanic Types

| Type | action_value | Use Case |
|------|--------------|----------|
| `open` | `{"state": "open"}` | Doors, containers, drawers |
| `examine` | `{"text": "..."}` | Read descriptions, inspections |
| `take` | `{"item": "name"}` | Pick up items, weapons |
| `use` | `{"effect": "..."}` | Using items on objects |
| `teleport` | `{"destination": place_id}` | Portals, stairs, passages |
| `create_area` | `{"subarea": subarea_id}` | Interior spaces (inside objects) |
| `trigger` | `{"message": "..."}` | Events, story triggers |

### Spatial Directions

6 directions for place connections:
- `north` - Traditional north
- `south` - Traditional south
- `east` - Traditional east
- `west` - Traditional west
- `up` - Up (stairs, flying)
- `down` - Down (basements, descending)

Constraint: **One exit per direction per place** (enforced by unique constraint)

## File Structure & Responsibilities

```
openworld/
├── admin.html          # UI markup, forms, modals
├── admin.css           # Styling (dark theme)
├── admin.js            # State management, API calls
├── api.php             # Backend handlers
├── database-schema.sql # MySQL table definitions
├── README.md           # Full documentation
├── SETUP.md            # Installation guide
└── QUICK_REF.md        # This file
```

## Code Examples

### Add World from Frontend

```javascript
fetch('/gamehappy/gamehappy.app/openworld/api.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        action: 'create_world',
        name: 'Enchanted Forest',
        description: 'A mystical woodland',
        is_public: 1
    })
})
.then(r => r.json())
.then(data => console.log(data.world_id));
```

### Link Two Places

```javascript
fetch('/gamehappy/gamehappy.app/openworld/api.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        action: 'link_places',
        from_place_id: 1,
        to_place_id: 2,
        direction: 'north'
    })
});
```

### Add Mechanic to Object

```javascript
// Open mechanic
{
    action: 'add_mechanic',
    object_id: 789,
    type: 'open',
    name: 'Open Door',
    description: 'Opens the wooden door',
    action_value: JSON.stringify({state: 'open'})
}

// Teleport mechanic
{
    action: 'add_mechanic',
    object_id: 789,
    type: 'teleport',
    name: 'Enter Portal',
    description: 'Steps through portal',
    action_value: JSON.stringify({destination: 5})
}
```

## Database Schema Quick View

**Key Tables:**
- `ow_worlds` - Container for all content
- `ow_places` - Rooms/locations (connected by exits)
- `ow_place_exits` - Directional connections between places
- `ow_objects` - Items/NPCs/furniture in places
- `ow_mechanics` - Actions available on objects
- `ow_sub_areas` - Interior spaces within objects
- `ow_plot_assignments` - Player land allocation
- `ow_permissions` - Role-based access

**Foreign Key Relationships:**
```
ow_worlds
  ├── ow_places
  │   ├── ow_place_exits
  │   └── ow_objects
  │       ├── ow_mechanics
  │       └── ow_sub_areas
  └── ow_plot_assignments
```

## Common Tasks

### Create a Simple Location Chain

```javascript
// 1. Create world
const world = await create('create_world', {name: 'Castle', description: '...'});

// 2. Create three places
const hall = await create('create_place', {world_id: world.world_id, name: 'Grand Hall'});
const study = await create('create_place', {world_id: world.world_id, name: 'Library'});
const tower = await create('create_place', {world_id: world.world_id, name: 'Tower'});

// 3. Link them
await create('link_places', {from_place_id: hall.place_id, to_place_id: study.place_id, direction: 'east'});
await create('link_places', {from_place_id: study.place_id, to_place_id: tower.place_id, direction: 'up'});

// 4. Add object to hall
const throne = await create('create_object', {place_id: hall.place_id, name: 'Throne'});

// 5. Add examine mechanic
await create('add_mechanic', {
    object_id: throne.object_id,
    type: 'examine',
    name: 'Examine Throne',
    description: 'A magnificent throne of gold and jewels',
    action_value: JSON.stringify({text: 'The throne sparkles with ancient power.'})
});
```

## Authentication

- All endpoints require: `$_SESSION['user_id']`
- Admin check: `isAdmin($user_id)` in `api.php`
- Session cookie: `PHPSESSID`

Update `isAdmin()` based on your auth system:

```php
function isAdmin($user_id) {
    // Your logic here
    return true; // For testing
}
```

## Error Handling

All API responses follow pattern:

```json
{
    "success": true/false,
    "message": "Human readable message",
    "data_field": "additional data if applicable"
}
```

Common errors:
- `"Unauthorized"` - Session not found or not admin
- `"World ID and place name required"` - Missing input
- `"World not found or access denied"` - Permission denied
- `"Exit already exists in that direction"` - Duplicate direction

## Performance Notes

- Indexes on all foreign keys for fast queries
- Unique constraint on `(from_place_id, direction)` for quick duplicates check
- JSON storage for mechanic configs (extensible without schema changes)
- Prepared statements to prevent SQL injection

## Security Checklist

✅ Prepared statements (SQL injection prevention)
✅ Session validation (authentication)
✅ Admin role check (authorization)
✅ Input validation on all endpoints
✅ UNIQUE constraints prevent invalid data
✅ Foreign keys maintain referential integrity

⚠️ Not yet implemented:
- Rate limiting
- Audit logging
- CSRF tokens (needed if moving to GET requests)
- Input sanitization for display (XSS prevention)

## Next Phase (Phase 2)

**Files to Create:**
- `player.html` - Player dashboard
- `player.js` - Player logic
- `player-api.php` - Player endpoints

**New Endpoints:**
- `get_assigned_plot` - Get player's plot
- `create_player_object` - Limited object creation
- `get_available_mechanics` - Restricted mechanic types

**Permission Levels:**
- Admin: Full control
- Editor: Can create content
- Viewer: Read-only access

## Testing Checklist

- [ ] Create world successfully
- [ ] Create multiple places
- [ ] Link places in all 6 directions
- [ ] Get places returns correct exits
- [ ] Create objects in place
- [ ] Add different mechanic types
- [ ] Verify action_value is stored as JSON
- [ ] Delete place (tests cascade delete)
- [ ] Session timeout (401 error)

## Debugging Tips

### Frontend (Browser Console)
```javascript
// Check API response
fetch('/gamehappy/gamehappy.app/openworld/api.php', {...})
    .then(r => r.json())
    .then(d => console.log(d));

// Check current state
console.log({currentWorld, currentPlace, places, objects});
```

### Backend (PHP)
```php
// Log to PHP error log
error_log(print_r($_POST, true));
error_log($db->error);

// Check prepared statement errors
if (!$stmt->execute()) {
    echo json_encode(['success' => false, 'message' => $stmt->error]);
}
```

### Database (MySQL)
```sql
-- Check all worlds
SELECT * FROM ow_worlds;

-- Check places in world
SELECT * FROM ow_places WHERE world_id = 1;

-- Check exits from place
SELECT * FROM ow_place_exits WHERE from_place_id = 1;

-- Check mechanics on object
SELECT * FROM ow_mechanics WHERE object_id = 1;
```

## Contact & Support

For development questions:
1. Review `README.md` for full documentation
2. Check `SETUP.md` for installation issues
3. Review browser console for frontend errors
4. Check PHP error logs for backend issues
5. Verify database connection and schema

---

**Version:** 1.0 - Phase 1
**Last Updated:** 2024
**Status:** Development Ready
