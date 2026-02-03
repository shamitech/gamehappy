# Quest Task Room Integration

## Overview
This feature allows administrators to assign quest tasks directly to rooms (places) and manage them within the room settings view. When viewing a room, admins can see all quest tasks assigned to that room and add more tasks from available quests.

## User Workflow

1. **View Room Settings**: Click the "Settings" button next to a room in the places list
2. **See Assigned Tasks**: View all quest tasks currently assigned to that room
3. **Add More Tasks**: Click "+ Assign Task" to add tasks from available quests
4. **Select Quest**: Choose a quest from the dropdown
5. **Select Task**: Choose a task from that quest (unassigned tasks only)
6. **Remove Tasks**: Click "Remove from Room" to unassign a task

## Technical Implementation

### Backend (PHP) - `/openworld/api/admin.php`

#### New Actions
- `assign_task_to_place` - Assigns a quest task to a room
- `unassign_task_from_place` - Removes a task from a room  
- `get_place_quest_tasks` - Gets all tasks assigned to a specific room

#### Modified Functions
- `ensureQuestTables()` - Now adds `type` and `placed` columns if missing
- `createQuestTask()` - Now accepts `type` parameter
- `getQuestTasks()` - Now includes `type` field in results

### Database Schema

#### ow_quest_tasks Table
```sql
- linked_place_id INT (FK to ow_places.id)
- placed TINYINT (0 = not placed, 1 = placed in a room)
- type ENUM('main', 'side') (task type within quest)
```

### Frontend (JavaScript) - `/openworld/admin.js`

#### New Global Variables
- `currentPlaceId` - Tracks which room's settings are open
- `currentPlaceQuestTasks` - Stores tasks assigned to current room

#### New Functions
- `showPlaceDetailsView(placeId)` - Opens room settings view
- `goBackToPlaces()` - Returns to rooms list
- `loadPlaceQuestTasks(placeId)` - Fetches tasks assigned to room
- `renderPlaceQuestTasks()` - Displays tasks in UI
- `openAssignTasksModal()` - Opens modal to assign tasks
- `loadAssignableTasksForQuest()` - Populates task dropdown based on quest selection
- `confirmAssignTaskToRoom()` - Assigns selected task to room
- `removeTaskFromPlace(taskId)` - Unassigns a task from room

### Frontend (HTML) - `/openworld/admin.html`

#### New Sections
- `view-place-details` - Room settings view with:
  - Back button to return to rooms list
  - Quest tasks list showing all assigned tasks
  - "+ Assign Task" button
  - Task details: name, type (Main/Side), quest name, description
  - "Remove from Room" button for each task

#### New Modal
- `modal-assign-task-to-room` - Two-step modal:
  - Quest selector dropdown
  - Task selector dropdown (filters by quest)
  - "Assign Task" / "Cancel" buttons

## Key Features

1. **Task Filtering**: Only shows unassigned tasks in the dropdown (tasks already assigned to this room are excluded)
2. **Task Display**: Shows which quest each task belongs to, along with task type (Main/Optional)
3. **One-to-One Mapping**: Each task can only be assigned to one room at a time
4. **Bidirectional Updates**: When assigning/removing, both `linked_place_id` and `placed` flag are updated
5. **Navigation**: "Settings" button in places list opens room settings directly

## API Endpoints

### POST /openworld/api/admin.php

#### assign_task_to_place
```json
{
  "action": "assign_task_to_place",
  "task_id": 1,
  "place_id": 5
}
```

#### unassign_task_from_place
```json
{
  "action": "unassign_task_from_place",
  "task_id": 1
}
```

#### get_place_quest_tasks
```json
{
  "action": "get_place_quest_tasks",
  "place_id": 5
}
```

Returns:
```json
{
  "success": true,
  "tasks": [
    {
      "id": 1,
      "name": "Find the Crystal",
      "description": "Search for the crystal in the temple",
      "type": "main",
      "quest_id": 2,
      "quest_name": "The Lost Temple"
    }
  ]
}
```

## Dependencies

- Existing quest system (ow_quests, ow_quest_tasks tables)
- Existing places/rooms system (ow_places table)
- Admin authentication via session

## Testing Checklist

- [ ] Create a world with quests and tasks
- [ ] Click "Settings" on a room
- [ ] See empty tasks list initially
- [ ] Click "+ Assign Task"
- [ ] Select a quest from dropdown
- [ ] Select a task from that quest
- [ ] Confirm task appears in room settings
- [ ] Assign another task and verify both show
- [ ] Click "Remove from Room" and verify task disappears
- [ ] Navigate back and forth between views
