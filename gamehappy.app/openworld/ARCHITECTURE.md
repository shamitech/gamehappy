# Open World Game - System Architecture

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      OPEN WORLD GAME                            │
│              Collaborative Text-Based World Builder              │
└─────────────────────────────────────────────────────────────────┘

                         ┌──────────────────┐
                         │   Browser Client │
                         │   (User Admin)   │
                         └────────┬─────────┘
                                  │
                         HTTP POST/Response
                         JSON Data Exchange
                                  │
                    ┌─────────────▼─────────────┐
                    │   Admin Dashboard         │
                    │  (admin.html/css/js)      │
                    │                           │
                    │ • Worlds Tab              │
                    │ • Places Tab              │
                    │ • Objects Tab             │
                    │ • Mechanics Modal         │
                    └────────────┬──────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   API Endpoint          │
                    │   (api.php)             │
                    │                         │
                    │ 8 Action Handlers       │
                    │ • create_world          │
                    │ • get_worlds            │
                    │ • create_place          │
                    │ • get_places            │
                    │ • link_places           │
                    │ • create_object         │
                    │ • get_objects           │
                    │ • add_mechanic          │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   MySQL Database        │
                    │   (8 Tables)            │
                    │                         │
                    │ ow_worlds               │
                    │ ow_places               │
                    │ ow_place_exits          │
                    │ ow_objects              │
                    │ ow_mechanics            │
                    │ ow_sub_areas            │
                    │ ow_plot_assignments     │
                    │ ow_permissions          │
                    └─────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Action                          │
│              (Click button on admin.html)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    JavaScript Handler                       │
│                   (admin.js function)                       │
│                                                             │
│  • Validate input                                           │
│  • Build request JSON                                       │
│  • Call fetch() to API                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       HTTP Request                          │
│                    POST /api/openworld/api.php              │
│                 Content-Type: application/json              │
│                                                             │
│  {"action": "create_world", "name": "...", ...}             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     PHP API Handler                         │
│                     (api.php)                               │
│                                                             │
│  • Verify session & admin status                            │
│  • Validate input parameters                                │
│  • Prepare SQL statement                                    │
│  • Execute database operation                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    MySQL Database                           │
│                  (INSERT, SELECT, etc.)                     │
│                                                             │
│  • Validate constraints (foreign keys, unique)              │
│  • Write/Read data                                          │
│  • Return result                                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   JSON Response                             │
│              (Back through API handler)                     │
│                                                             │
│  {"success": true, "world_id": 123}                         │
│  or                                                         │
│  {"success": false, "message": "Error..."}                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              JavaScript Response Handler                    │
│                   (admin.js .then)                          │
│                                                             │
│  • Parse JSON                                               │
│  • Update UI state                                          │
│  • Show success/error message                               │
│  • Refresh data displays                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Visual Update in Browser                      │
│                (admin.html updates)                         │
│                                                             │
│  • Message appears and auto-dismisses                       │
│  • Lists refresh with new data                              │
│  • Form clears for next entry                               │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Relationships

```
┌──────────────────────────┐
│       ow_worlds          │ (Admin creates top-level worlds)
│ ─────────────────────── │
│ id (PK)                 │
│ name                    │
│ description             │
│ created_by (FK users)   │
│ is_public               │
└────────────┬────────────┘
             │
             │ contains
             │
             ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│      ow_places           │◄────►│   ow_place_exits         │
│ ─────────────────────── │      │ ─────────────────────── │
│ id (PK)                 │      │ id (PK)                 │
│ world_id (FK)           │      │ from_place_id (FK) ────┐
│ name                    │      │ to_place_id (FK)    ────┼─┐
│ description             │      │ direction            │ │ │
│ created_by (FK users)   │      │ (N/S/E/W/Up/Down)    │ │ │
└────────────┬────────────┘      │ UNIQUE(from, dir)    │ │ │
             │                   └──────────────────────┘ │ │
             │                                             │ │
             │ contains                    ┌───────────────┘ │
             │                             │                 │
             ▼                             │                 │
┌──────────────────────────┐               │                 │
│     ow_objects           │               │                 │
│ ─────────────────────── │               │                 │
│ id (PK)                 │               │ (Creates        │
│ place_id (FK) ──────────┼───────────────┘  spatial        │
│ name                    │                  network)       │
│ description             │                                 │
│ created_by (FK users)   │                                 │
│ is_visible              │                                 │
└────────────┬────────────┘                                 │
             │                                             │
             │ has interactions                            │
             │                                             │
             ▼                                             │
┌──────────────────────────┐                               │
│    ow_mechanics          │                               │
│ ─────────────────────── │                               │
│ id (PK)                 │                               │
│ object_id (FK) ─────────┘                               │
│ type (enum)                                             │
│ name                                                    │
│ description                                             │
│ action_value (JSON)     ◄──────────────────────────────┘
│ is_active               │ (Teleport destinations
└─────────────────────────┘  point back to places)

Additional Tables (for Phase 2+):
┌──────────────────────────┐
│  ow_plot_assignments     │ (Allocate plots to players)
│ ─────────────────────── │
│ world_id (FK)           │
│ player_id (FK users)    │
│ assigned_by (FK users)  │
└──────────────────────────┘

┌──────────────────────────┐
│    ow_permissions        │ (Role-based access)
│ ─────────────────────── │
│ world_id (FK)           │
│ user_id (FK)            │
│ role (admin/editor/...) │
└──────────────────────────┘
```

## Authentication Flow

```
┌──────────────┐
│ User Login   │ (Existing auth system)
│ (login.php)  │
└───────┬──────┘
        │
        ▼
┌──────────────────────────┐
│ Session Created          │
│ $_SESSION['user_id']     │
│ $_SESSION['...']         │
└───────┬──────────────────┘
        │
        ▼
┌──────────────────────────┐
│ Navigate to admin.html   │
│ JavaScript loads         │
└───────┬──────────────────┘
        │
        ▼
┌──────────────────────────┐
│ Submit API Request       │
│ Session cookie sent      │
└───────┬──────────────────┘
        │
        ▼
┌──────────────────────────┐
│ api.php received         │
│ session_start()          │
│ Check session exists     │
└───────┬────────┬─────────┘
        │        │
    YES │        │ NO
        │        └─► 401 Unauthorized
        │
        ▼
┌──────────────────────────┐
│ Check isAdmin()          │
└───────┬────────┬─────────┘
        │        │
    YES │        │ NO
        │        └─► 401 Unauthorized
        │
        ▼
┌──────────────────────────┐
│ Process request          │
│ Database operations      │
└───────┬──────────────────┘
        │
        ▼
┌──────────────────────────┐
│ Return JSON response     │
│ Frontend updates UI      │
└──────────────────────────┘
```

## UI Tab Structure

```
Admin Dashboard (admin.html)
│
├─ Header
│  ├─ Title
│  └─ Logout Button
│
├─ Navigation Tabs
│  ├─ Worlds Tab
│  ├─ Places Tab
│  └─ Objects Tab
│
├─ Worlds Tab Content (id="worlds")
│  ├─ Panel: Create New World
│  │  └─ Form
│  │     ├─ name input
│  │     ├─ description textarea
│  │     ├─ public checkbox
│  │     └─ submit button
│  │
│  └─ Panel: Worlds List
│     └─ List of all worlds
│
├─ Places Tab Content (id="places")
│  ├─ Panel: Select World
│  │  └─ world-select dropdown
│  │
│  ├─ Panel: Create New Place (hidden until world selected)
│  │  └─ Form
│  │
│  ├─ Panel: Link Places (hidden until world selected)
│  │  └─ Form
│  │
│  └─ Panel: Places List
│
├─ Objects Tab Content (id="objects")
│  ├─ Panel: Select Place
│  │  └─ place-select dropdown
│  │
│  ├─ Panel: Create Object (hidden until place selected)
│  │  └─ Form
│  │
│  └─ Panel: Objects List
│     └─ Objects with "Add Mechanic" buttons
│
└─ Mechanics Modal (hidden by default)
   ├─ Close button
   ├─ Mechanic Type selector
   ├─ Name input
   ├─ Description textarea
   ├─ Dynamic settings (based on type)
   └─ Submit button
```

## Mechanic Type Configuration Flow

```
User selects mechanic type → showMechanicSettings()
            │
            ▼
     ┌──────────────────────┐
     │  Check mechanic type │
     └──────┬───────────────┘
            │
    ┌───────┼───────┬───────┬─────────┬──────────┬──────────┐
    │       │       │       │         │          │          │
    ▼       ▼       ▼       ▼         ▼          ▼          ▼
  open   examine   take    use    teleport  create_area  trigger
    │       │       │       │         │          │          │
    ▼       ▼       ▼       ▼         ▼          ▼          ▼
  state   text    item   effect    destination  subarea   message
  field  field    field   field     dropdown     select    field


User fills settings → addMechanic() → API call
                     │
                     ▼
             Build action_value JSON
             │
             ├─ open: {"state": "..."}
             ├─ examine: {"text": "..."}
             ├─ take: {"item": "..."}
             ├─ use: {"effect": "..."}
             ├─ teleport: {"destination": place_id}
             ├─ create_area: {"subarea": subarea_id}
             └─ trigger: {"message": "..."}
             │
             ▼
        Store in database
        action_value JSON column
```

## API Request-Response Pattern

```
Frontend Request:
┌─────────────────────────────────────┐
│ POST /api/openworld/api.php         │
│                                     │
│ Headers:                            │
│ - Content-Type: application/json    │
│ - Cookie: PHPSESSID=...             │
│                                     │
│ Body:                               │
│ {                                   │
│   "action": "create_world",         │
│   "name": "Sample World",           │
│   "description": "A test world",    │
│   "is_public": 1                    │
│ }                                   │
└─────────────────────────────────────┘

Backend Processing:
┌─────────────────────────────────────┐
│ 1. session_start()                  │
│ 2. Check $_SESSION['user_id'] exists│
│ 3. Check isAdmin() returns true     │
│ 4. Read $_POST or file_get_contents │
│ 5. json_decode() input              │
│ 6. $db->prepare() SQL               │
│ 7. $stmt->bind_param()              │
│ 8. $stmt->execute()                 │
│ 9. Build response array             │
│ 10. json_encode() response          │
└─────────────────────────────────────┘

Success Response:
┌─────────────────────────────────────┐
│ HTTP 200                            │
│                                     │
│ {                                   │
│   "success": true,                  │
│   "message": "World created",       │
│   "world_id": 42                    │
│ }                                   │
└─────────────────────────────────────┘

Error Response:
┌─────────────────────────────────────┐
│ HTTP 400/401/500                    │
│                                     │
│ {                                   │
│   "success": false,                 │
│   "message": "World name required"  │
│ }                                   │
└─────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Production Server                     │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │            Apache/Nginx Web Server               │  │
│  │                                                 │  │
│  │  ├─ /gamehappy/gamehappy.app/                  │  │
│  │  │  ├─ index.html                              │  │
│  │  │  ├─ login.html                              │  │
│  │  │  ├─ auth/                                   │  │
│  │  │  │  └─ ...                                  │  │
│  │  │  └─ openworld/                              │  │
│  │  │     ├─ admin.html ◄──── Access point       │  │
│  │  │     ├─ admin.css                            │  │
│  │  │     ├─ admin.js                             │  │
│  │  │     ├─ api.php ◄──── API endpoint          │  │
│  │  │     └─ [other files]                        │  │
│  │  │                                              │  │
│  │  └─ other apps...                              │  │
│  │                                                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │               PHP Runtime (7.4+)                 │  │
│  │                                                 │  │
│  │  • Sessions                                     │  │
│  │  • PDO/MySQLi                                   │  │
│  │  • JSON functions                               │  │
│  │                                                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │           MySQL/MariaDB Database                │  │
│  │                                                 │  │
│  │  database: gamehappy                            │  │
│  │  tables: 8 (ow_*)                               │  │
│  │  users: [existing auth system]                  │  │
│  │                                                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Architecture Complete:** All layers documented
**Phase 1 Status:** ✅ Ready for deployment
**Next Phase:** Phase 2 - Player Creation Interface
