# Open World Game - Setup Instructions

## Prerequisites

- PHP 7.4+ with MySQLi extension
- MySQL 5.7+ (or MariaDB equivalent)
- Existing `gamehappy` database
- User authentication system in place (with `users` table)

## Installation Steps

### 1. Database Setup

Run the database schema to create all required tables:

```bash
mysql -u root -p gamehappy < openworld/database-schema.sql
```

Or paste the contents of `database-schema.sql` into your MySQL admin tool (phpMyAdmin, etc.)

This creates:
- ow_worlds
- ow_places
- ow_place_exits
- ow_objects
- ow_mechanics
- ow_sub_areas
- ow_plot_assignments
- ow_permissions

### 2. File Placement

Ensure these files are in: `/gamehappy/gamehappy.app/openworld/`

```
openworld/
├── admin.html          ✓
├── admin.css           ✓
├── admin.js            ✓
├── api.php             ✓
├── database-schema.sql ✓
├── README.md           ✓
└── SETUP.md            ✓ (this file)
```

### 3. Access the Admin Dashboard

1. Ensure you're logged in as an admin user
2. Navigate to: `http://localhost/gamehappy/gamehappy.app/openworld/admin.html`
3. You should see the admin dashboard with three tabs: Worlds, Places, Objects

### 4. Verify Installation

**Test World Creation:**
1. Go to "Worlds" tab
2. Enter world name: "Test World"
3. Click "Create World"
4. You should see success message and world appear in list

**Test Place Creation:**
1. Go to "Places" tab
2. Select "Test World" from dropdown
3. Enter place name: "Library"
4. Click "Create Place"
5. Verify place appears in list

**Test Linking:**
1. Create another place: "Reading Room"
2. In "Link Places" section:
   - From Place: Library
   - Direction: North
   - To Place: Reading Room
   - Click "Link Places"

**Test Objects:**
1. Go to "Objects" tab
2. Select "Library" place from dropdown
3. Create object: "Bookshelf"
4. Click "Add Mechanic" button
5. Add examine mechanic with description "A tall shelf full of books"

### 5. Authentication Setup (Important)

The API currently uses session-based authentication. The `isAdmin()` function in `api.php` needs to be updated based on your auth system:

```php
// In api.php, update this function:
function isAdmin($user_id) {
    // Option 1: Check admin flag in users table
    global $db;
    $stmt = $db->prepare('SELECT is_admin FROM users WHERE id = ?');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $result && $result['is_admin'];
    
    // Option 2: Check permissions table
    // $stmt = $db->prepare('SELECT role FROM ow_permissions WHERE user_id = ? AND role = "admin"');
    // ...
}
```

### 6. Browser Testing

**Recommended Testing Order:**
1. ✓ Create a world
2. ✓ Create 3+ places
3. ✓ Link places in all directions (north, south, east, west)
4. ✓ Create objects in each place
5. ✓ Add different mechanic types to objects

**Known Issues:**
- Currently no edit/delete functionality (marked as TODO)
- Mechanic settings panel shown but not fully validated
- No world deletion (prevents accidental data loss)

## API Testing with cURL

Test endpoints directly:

```bash
# Create a world
curl -X POST http://localhost/gamehappy/api/openworld/api.php \
  -H "Content-Type: application/json" \
  -b "PHPSESSID=your_session_id" \
  -d '{"action":"create_world","name":"Test","description":"Test world"}'

# Get worlds
curl -X POST http://localhost/gamehappy/api/openworld/api.php \
  -H "Content-Type: application/json" \
  -b "PHPSESSID=your_session_id" \
  -d '{"action":"get_worlds"}'
```

## Troubleshooting

### 401 Unauthorized Error
- Check that you're logged in
- Verify session is active (`$_SESSION['user_id']` exists)
- Check `isAdmin()` function returns true

### Database Connection Error
- Verify MySQL is running
- Check credentials in `api.php` (localhost, root, password, gamehappy)
- Confirm `users` table exists (for foreign key relationship)

### Places/Objects Not Loading
- Verify world/place was actually created
- Check browser console for JavaScript errors
- Ensure database tables were created (check in phpMyAdmin)

### Duplicate Direction Error
- You already created an exit in that direction from that place
- Each place can only have one exit per direction
- To change: Create new place or modify the existing connection logic

## Features Implemented

✅ World creation and management
✅ Place creation with descriptions
✅ Directional place linking (6 directions)
✅ Object creation and listing
✅ Mechanic addition with type-specific settings
✅ Session-based authentication
✅ Database schema with proper relationships
✅ RESTful JSON API
✅ Dark-themed text-based UI
✅ Error handling and validation

## Features Not Yet Implemented

❌ Edit/Delete functionality for worlds, places, objects
❌ Sub-area management UI
❌ Plot assignment interface
❌ Player creation interface (Phase 2)
❌ World exploration interface (Phase 3)
❌ NPC system
❌ Inventory system
❌ Audit logging
❌ Rate limiting

## Next Phase (Phase 2 - Player Creation)

Create player-side interface:
- [player.html] - Player creation dashboard
- [player.js] - Player logic
- [player-api.php] - Player-specific API endpoints

Players will:
- See their assigned plot
- Create objects within plot
- Configure limited mechanics
- Can't access admin functions

## Support

For issues or questions:
1. Check browser console (F12 → Console tab)
2. Check PHP error logs
3. Verify database connection
4. Review API endpoint response in Network tab (F12 → Network)
5. Check `README.md` for detailed documentation

---

**Installation Date:** [Your Date]
**Version:** 1.0 - Phase 1 Admin System
**Status:** Ready for Testing
