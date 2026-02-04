# Quest Task Actions & Kickback System

## Overview

A comprehensive system for creating quest tasks that are completed by specific player actions (mechanics) and triggered side quests (kickbacks) that appear when certain conditions are met.

## Key Features

### 1. **Task Completion Actions**
- Tasks are completed when players execute specific mechanics
- Multiple mechanics can complete a single task (e.g., "unlock door" completes both "Find Key" and "Open Door" tasks)
- Mechanics are auto-filtered by object type (doors show only open/enter actions)
- Completion is tracked per-player

### 2. **Kickback Tasks (Conditional Side Quests)**
- Hidden tasks that appear when a player attempts an action they can't yet complete
- Pre-configured in the quest editor (not dynamically created)
- Can be chained (a kickback task can have its own kickbacks)
- Multiple kickback options per task (system selects one randomly)
- Shows relationship to original task in quest log

### 3. **Streamlined UI**
- Single unified modal for creating quests and tasks
- Inline mechanics selection (auto-filtered per object)
- Built-in kickback task configuration
- Shows which mechanics complete which tasks in quest list
- Shows available kickback tasks in quest list

## Database Schema

### New Tables

**ow_task_mechanics** - Links tasks to the mechanics that complete them
```sql
CREATE TABLE ow_task_mechanics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,              -- Which task is completed
    mechanic_id INT NOT NULL,          -- Which mechanic completes it
    required_action VARCHAR(50),       -- Action type (open, take, examine, etc)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_task_mechanic (task_id, mechanic_id)
)
```

**ow_task_kickbacks** - Configures kickback tasks and their triggers
```sql
CREATE TABLE ow_task_kickbacks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_task_id INT NOT NULL,     -- The task being attempted
    kickback_task_id INT NOT NULL,     -- The side task to activate
    trigger_condition LONGTEXT,        -- JSON condition (reserved for future)
    priority INT DEFAULT 0,            -- Random selection weight
    is_enabled TINYINT DEFAULT 1,      -- Enable/disable kickback
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**ow_completed_tasks** - Tracks which tasks each player has completed
```sql
CREATE TABLE ow_completed_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    task_id INT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_player_task (player_id, task_id)
)
```

## Admin API Endpoints

### Quest Task Management
- `link_task_mechanic` - Link a mechanic to a task
- `unlink_task_mechanic` - Remove a mechanic from a task
- `get_task_mechanics` - Get all mechanics for a task
- `get_compatible_mechanics` - Get available mechanics for an object
- `add_task_kickback` - Add a kickback task to an original task
- `remove_task_kickback` - Remove a kickback task
- `get_task_kickbacks` - Get all kickbacks for a task

### Examples

**Link mechanics to a task:**
```javascript
{
    action: 'link_task_mechanic',
    task_id: 5,
    mechanic_id: 12
}
```

**Add kickback task:**
```javascript
{
    action: 'add_task_kickback',
    original_task_id: 5,        // Task: "Unlock the door"
    kickback_task_id: 8,        // Kickback: "Find the key"
    priority: 0                 // Random selection weight
}
```

**Get compatible mechanics for object:**
```javascript
{
    action: 'get_compatible_mechanics',
    object_id: 42
}
```

## Player API

### execute_mechanic - Executes a mechanic and checks for task completion

**Request:**
```javascript
{
    action: 'execute_mechanic',
    player_id: 3,
    mechanic_id: 12,
    object_id: 42,
    place_id: 7  // Optional: room where the action happens
}
```

**Response:**
```javascript
{
    success: true,
    message: 'Action completed',
    mechanic: {
        id: 12,
        type: 'open',
        name: 'Open door'
    },
    completed_tasks: [
        {
            id: 5,
            name: 'Find the golden key',
            quest_id: 2,
            quest_name: 'The Lost Artifact'
        }
    ],
    kickback_tasks: [
        {
            id: 8,
            name: 'Retrieve the key from the vault',
            description: 'A hidden side quest...',
            quest_id: 2,
            quest_name: 'The Lost Artifact'
        }
    ]
}
```

## Admin UI Workflow

### Creating a Quest with Tasks (Streamlined)

1. **Open Quest Management** - Click "Quest Management" button
2. **Create Quest** - Click "+ Create Quest" button
   - Set name, description, type (Main/Side)
3. **Add Tasks** - Click "+ Add Task" on quest
   - **Task Details Section**
     - Name, description, required/optional
   - **Location Section**
     - Assign to room (optional)
     - Assign to object (optional)
     - Selecting object shows available mechanics
   - **Task Completion Actions Section**
     - Checkboxes for each mechanic that completes the task
     - Mechanics auto-filtered by selected object
   - **Kickback Tasks Section**
     - Select existing tasks as kickbacks
     - Can add multiple kickback options
     - Click "+ Add" to add to the task

4. **Save Task** - Click "Create Task"
   - Task is created
   - Mechanics are linked
   - Kickback tasks are configured
   - UI shows mechanics and kickbacks in task list

## Usage Example: Locked Door Quest

### Setup (Admin Side)

1. Create Quest: "Find the Artifact"
2. Create Task 1: "Unlock the vault door"
   - Assign to: Room "Treasure Chamber", Object "vault door"
   - Completion Action: Select "open" mechanic on vault door
   - Save

3. Create Task 2: "Find the key to the vault"
   - Assign to: Room "Basement", Object "treasure chest"
   - Completion Action: Select "take" mechanic on key object
   - Save

4. Add Kickback to Task 1:
   - Original Task: "Unlock the vault door"
   - Kickback Task: "Find the key to the vault"
   - Priority: 0
   - This means: When player tries to open vault without key, Task 2 appears

### Gameplay (Player Side)

1. Player in Treasure Chamber, tries to execute "open" mechanic on vault
2. System calls `execute_mechanic` endpoint
3. API response includes:
   - No completed tasks (key not yet collected)
   - Kickback task: "Find the key to the vault" is triggered and shown
4. Player goes to Basement, collects key (executes "take" mechanic)
5. System marks Task 2 complete
6. Player returns to Treasure Chamber, tries vault again
7. System marks Task 1 complete
8. Quest progress updates

## Important Implementation Notes

### Mechanic Type Filtering
- When admin selects an object, only mechanics that exist on that object are shown
- This prevents assigning incompatible actions

### Task Completion Tracking
- Per-player completion tracking prevents duplicate completions
- `ow_completed_tasks` table has unique constraint on (player_id, task_id)

### Kickback Selection
- Multiple kickbacks can be assigned to one task
- System selects one based on priority (higher priority = more likely to be selected)
- Currently selects the first (highest priority) - future enhancement: random weighted selection

### Nested Kickbacks
- Kickback tasks can themselves have kickback tasks
- Allows for complex quest chains
- Example: Task A → Kickback B → Kickback C

## Frontend Functions

### Admin JavaScript (admin.js)

**Task Creation:**
- `openCreateTaskModalEnhanced()` - Opens enhanced task creation modal
- `updateTaskEnhancedObjects()` - Updates object list when room selected
- `updateTaskEnhancedMechanics()` - Loads mechanics for selected object
- `toggleTaskMechanic(mechanicId)` - Select/deselect mechanic
- `addTaskKickbackToList()` - Add kickback task to list
- `removeTaskKickbackFromList(taskId)` - Remove kickback from list
- `createNewQuestTaskEnhanced()` - Save task with all mechanics and kickbacks

**Task Display:**
- `loadTaskMechanicsDisplay(taskId)` - Load and show mechanics for task
- `loadTaskKickbacksDisplay(taskId)` - Load and show kickbacks for task

## Future Enhancements

1. **Dynamic Kickback Triggering** - Create kickback tasks on-the-fly based on conditions
2. **Weighted Random Selection** - When multiple kickbacks exist, select based on priority
3. **Conditional Logic** - Complex trigger conditions (e.g., "if player has X item")
4. **Task Failure States** - Tasks that can be failed and need to be retried
5. **Reward Integration** - Tasks that grant gold, items, or other rewards
6. **Achievement System** - Special quests that unlock achievements

## Testing Checklist

- [ ] Create quest with task
- [ ] Assign mechanics to task
- [ ] Verify mechanics shown in task list
- [ ] Add kickback tasks to task
- [ ] Verify kickbacks shown in task list
- [ ] Player executes mechanic in game
- [ ] Verify task marked complete
- [ ] Verify kickback task appears in response
- [ ] Test nested kickback chains
- [ ] Verify per-player completion tracking
- [ ] Test with multiple mechanics completing one task
