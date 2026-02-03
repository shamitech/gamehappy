<?php
/**
 * Open World Game - Admin API
 * Handles world and place creation
 */

header('Content-Type: application/json');
session_start();

// Enable detailed error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Get database connection
$db_host = 'localhost';
$db_user = 'gamehappy';
$db_pass = 'GameHappy2026';
$db_name = 'gamehappy';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Check if admin is logged in
if (!($_SESSION['admin_logged_in'] ?? false)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$username = $_SESSION['admin_username'] ?? 'admin';

// Read action from GET, POST, or JSON body
$action = $_GET['action'] ?? null;
if (!$action) {
    $json_data = json_decode(file_get_contents('php://input'), true);
    $action = $json_data['action'] ?? null;
}

try {
    if (!$action) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Action parameter required']);
        exit;
    }
    
    switch ($action) {
        case 'create_world':
            createWorld($pdo, $username);
            break;
        case 'get_worlds':
            getWorlds($pdo);
            break;
        case 'create_place':
            createPlace($pdo, $username);
            break;
        case 'delete_place':
            deletePlace($pdo);
            break;
        case 'get_places':
            getPlaces($pdo);
            break;
        case 'link_places':
            linkPlaces($pdo);
            break;
        case 'create_object':
            createObject($pdo, $username);
            break;
        case 'add_mechanic':
            addMechanic($pdo);
            break;
        case 'get_objects':
            getObjects($pdo);
            break;
        case 'get_object_mechanics':
            getObjectMechanics($pdo);
            break;
        case 'delete_mechanic':
            deleteMechanic($pdo);
            break;
        case 'get_exits':
            getExits($pdo);
            break;
        case 'delete_exit':
            deleteExit($pdo);
            break;
        case 'update_exit_type':
            updateExitType($pdo);
            break;
        case 'ensure_connection_type_column':
            ensureConnectionTypeColumn($pdo);
            break;
        case 'ensure_coordinates':
            ensureCoordinateColumns($pdo);
            break;
        case 'ensure_placed':
            ensurePlacedColumn($pdo);
            break;
        case 'ensure_quest_tables':
            ensureQuestTables($pdo);
            break;
        case 'create_quest':
            createQuest($pdo, $username);
            break;
        case 'get_quests':
            getQuests($pdo);
            break;
        case 'create_quest_task':
            createQuestTask($pdo, $username);
            break;
        case 'get_quest_tasks':
            getQuestTasks($pdo);
            break;
        case 'link_quest_tasks':
            linkQuestTasks($pdo);
            break;
        case 'delete_quest_task':
            deleteQuestTask($pdo);
            break;
        case 'delete_quest_task_link':
            deleteQuestTaskLink($pdo);
            break;
        case 'delete_quest':
            deleteQuest($pdo);
            break;
        case 'assign_task_to_place':
            assignTaskToPlace($pdo);
            break;
        case 'unassign_task_from_place':
            unassignTaskFromPlace($pdo);
            break;
        case 'get_place_quest_tasks':
            getPlaceQuestTasks($pdo);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Error: ' . $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}

function createWorld($pdo, $username) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['name']) {
        throw new Exception('World name required');
    }
    
    $isPublic = (int)((isset($data['is_public']) && $data['is_public']) ? 1 : 0);
    
    error_log("[createWorld] Data received: " . json_encode($data));
    error_log("[createWorld] isPublic value: '$isPublic' (type: " . gettype($isPublic) . ")");
    
    $stmt = $pdo->prepare("
        INSERT INTO ow_worlds (name, description, created_by, is_public)
        VALUES (?, ?, ?, ?)
    ");
    
    error_log("[createWorld] Executing with values: name={$data['name']}, desc={$data['description']}, user=$username, is_public=$isPublic");
    
    try {
        $result = $stmt->execute([
            $data['name'],
            $data['description'] ?? null,
            $username,
            $isPublic
        ]);
    } catch (Exception $e) {
        error_log("[createWorld] Execute failed: " . $e->getMessage());
        throw $e;
    }
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'world_id' => $pdo->lastInsertId(),
            'message' => 'World created successfully'
        ]);
    } else {
        throw new Exception('Failed to insert world');
    }
    exit;
}

function getWorlds($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT id, name, description, created_at, is_public,
                   (SELECT COUNT(*) FROM ow_places WHERE world_id = ow_worlds.id) as place_count
            FROM ow_worlds
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $worlds = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'worlds' => $worlds]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

function createPlace($pdo, $username) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['world_id'] || !$data['name']) {
        throw new Exception('World ID and place name required');
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO ow_places (world_id, name, description, created_by)
        VALUES (?, ?, ?, ?)
    ");
    
    $result = $stmt->execute([
        $data['world_id'],
        $data['name'],
        $data['description'] ?? null,
        $username
    ]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'place_id' => $pdo->lastInsertId(),
            'message' => 'Place created successfully'
        ]);
    }
    exit;
}

function deletePlace($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['place_id']) {
        throw new Exception('Place ID required');
    }
    
    $placeId = $data['place_id'];
    
    // Delete all exits from this place
    $stmt = $pdo->prepare("DELETE FROM ow_place_exits WHERE from_place_id = ?");
    $stmt->execute([$placeId]);
    
    // Delete all exits to this place
    $stmt = $pdo->prepare("DELETE FROM ow_place_exits WHERE to_place_id = ?");
    $stmt->execute([$placeId]);
    
    // Delete all objects in this place
    $stmt = $pdo->prepare("DELETE FROM ow_objects WHERE place_id = ?");
    $stmt->execute([$placeId]);
    
    // Delete the place itself
    $stmt = $pdo->prepare("DELETE FROM ow_places WHERE id = ?");
    $result = $stmt->execute([$placeId]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Place deleted successfully'
        ]);
    }
    exit;
}

function getPlaces($pdo) {
    $json_data = json_decode(file_get_contents('php://input'), true);
    $worldId = $json_data['world_id'] ?? $_GET['world_id'] ?? null;
    
    if (!$worldId) {
        throw new Exception('World ID required');
    }
    
    // Log the request
    error_log("[getPlaces] Called for world_id: $worldId");
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, name, description, created_at, coord_x, coord_y, coord_z,
                   CASE 
                       WHEN (coord_x != 0 OR coord_y != 0 OR coord_z != 0) THEN 1
                       ELSE COALESCE(placed, 0)
                   END as placed
            FROM ow_places
            WHERE world_id = ?
            ORDER BY created_at ASC
        ");
    } catch (Exception $e) {
        // placed column doesn't exist yet, determine placed status from coordinates
        error_log("[getPlaces] First query failed, trying without placed column: " . $e->getMessage());
        try {
            $stmt = $pdo->prepare("
                SELECT id, name, description, created_at, coord_x, coord_y, coord_z,
                       CASE 
                           WHEN (coord_x != 0 OR coord_y != 0 OR coord_z != 0) THEN 1
                           ELSE 0
                       END as placed
                FROM ow_places
                WHERE world_id = ?
                ORDER BY created_at ASC
            ");
        } catch (Exception $e2) {
            // coord columns don't exist either, just return 0 for all
            error_log("[getPlaces] Second query failed too, using fallback: " . $e2->getMessage());
            $stmt = $pdo->prepare("
                SELECT id, name, description, created_at,
                       0 as placed,
                       0 as coord_x,
                       0 as coord_y,
                       0 as coord_z
                FROM ow_places
                WHERE world_id = ?
                ORDER BY created_at ASC
            ");
        }
    }
    
    $stmt->execute([$worldId]);
    $places = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Log each place's placed status
    foreach ($places as $p) {
        error_log("[getPlaces] Place ID {$p['id']}: name={$p['name']}, placed={$p['placed']}, coords=({$p['coord_x']},{$p['coord_y']},{$p['coord_z']})");
    }
    
    echo json_encode(['success' => true, 'places' => $places]);
    exit;
}

function linkPlaces($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    error_log("[linkPlaces] Called with from_place_id=" . ($data['from_place_id'] ?? 'NULL') . ", to_place_id=" . ($data['to_place_id'] ?? 'NULL') . ", direction=" . ($data['direction'] ?? 'NULL'));
    
    if (!$data['from_place_id'] || !$data['to_place_id'] || !$data['direction']) {
        throw new Exception('From place, to place, and direction required');
    }
    
    // Validate direction
    $validDirections = ['north', 'south', 'east', 'west', 'up', 'down', 'northeast', 'northwest', 'southeast', 'southwest'];
    if (!in_array(strtolower($data['direction']), $validDirections)) {
        throw new Exception('Invalid direction');
    }
    
    // Validate connection_type if provided
    $validConnectionTypes = ['full', 'passage', 'closed', 'locked', 'no_throughway'];
    $connectionType = 'full'; // default
    if (isset($data['connection_type']) && in_array($data['connection_type'], $validConnectionTypes)) {
        $connectionType = $data['connection_type'];
    }
    
    $direction = strtolower($data['direction']);
    $fromPlaceId = $data['from_place_id'];
    $toPlaceId = $data['to_place_id'];
    
    // Check if exit already exists
    $stmt = $pdo->prepare("
        SELECT id FROM ow_place_exits 
        WHERE from_place_id = ? AND direction = ?
    ");
    $stmt->execute([$fromPlaceId, $direction]);
    
    if ($stmt->fetch()) {
        throw new Exception('Exit already exists in that direction');
    }
    
    // Get or calculate coordinates for from_place
    $stmt = $pdo->prepare("SELECT coord_x, coord_y, coord_z FROM ow_places WHERE id = ?");
    $stmt->execute([$fromPlaceId]);
    $fromPlace = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$fromPlace) {
        throw new Exception('From place not found');
    }
    
    // Calculate target coordinates based on direction
    $fromX = $fromPlace['coord_x'] ?? 0;
    $fromY = $fromPlace['coord_y'] ?? 0;
    $fromZ = $fromPlace['coord_z'] ?? 0;
    
    $toX = $fromX;
    $toY = $fromY;
    $toZ = $fromZ;
    
    // Calculate new coordinates
    switch ($direction) {
        case 'north': $toY++; break;
        case 'south': $toY--; break;
        case 'east': $toX++; break;
        case 'west': $toX--; break;
        case 'northeast': $toX++; $toY++; break;
        case 'northwest': $toX--; $toY++; break;
        case 'southeast': $toX++; $toY--; break;
        case 'southwest': $toX--; $toY--; break;
        case 'up': $toZ++; break;
        case 'down': $toZ--; break;
    }
    
    // Get current coordinates of to_place if it exists
    $stmt = $pdo->prepare("SELECT coord_x, coord_y, coord_z FROM ow_places WHERE id = ?");
    $stmt->execute([$toPlaceId]);
    $toPlace = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$toPlace) {
        throw new Exception('To place not found');
    }
    
    $existingX = $toPlace['coord_x'];
    $existingY = $toPlace['coord_y'];
    $existingZ = $toPlace['coord_z'];
    
    // Check how many exits this place already has
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM ow_place_exits WHERE from_place_id = ?");
    $stmt->execute([$toPlaceId]);
    $exitCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // If place is already positioned somewhere, validate it matches the target coordinates
    if (!($existingX == 0 && $existingY == 0 && $existingZ == 0)) {
        // Place has been assigned coordinates already
        // Only allow the link if it's at the same X,Y (vertical stacking) or matches expected coordinates
        if ($existingX != $toX || $existingY != $toY || $existingZ != $toZ) {
            throw new Exception('Place already assigned to another location. Cannot link to (' . $existingX . ',' . $existingY . ',' . $existingZ . ')');
        }
    } else if ($exitCount == 0) {
        // Place has no coordinates and no exits - assign coordinates
        $stmt = $pdo->prepare("UPDATE ow_places SET coord_x = ?, coord_y = ?, coord_z = ? WHERE id = ?");
        $stmt->execute([$toX, $toY, $toZ, $toPlaceId]);
    } else {
        // Place has exits but no coordinates - assign coordinates
        $stmt = $pdo->prepare("UPDATE ow_places SET coord_x = ?, coord_y = ?, coord_z = ? WHERE id = ?");
        $stmt->execute([$toX, $toY, $toZ, $toPlaceId]);
    }
    
    // Create the exit
    $stmt = $pdo->prepare("
        INSERT INTO ow_place_exits (from_place_id, to_place_id, direction, connection_type)
        VALUES (?, ?, ?, ?)
    ");
    
    try {
        $result = $stmt->execute([
            $fromPlaceId,
            $toPlaceId,
            $direction,
            $connectionType
        ]);
    } catch (Exception $e) {
        // If connection_type column doesn't exist, try without it
        $stmt = $pdo->prepare("
            INSERT INTO ow_place_exits (from_place_id, to_place_id, direction)
            VALUES (?, ?, ?)
        ");
        $result = $stmt->execute([
            $fromPlaceId,
            $toPlaceId,
            $direction
        ]);
    }
    
    if ($result) {
        // Create the opposite direction exit (bidirectional)
        $oppositeDirections = [
            'north' => 'south',
            'south' => 'north',
            'east' => 'west',
            'west' => 'east',
            'northeast' => 'southwest',
            'northwest' => 'southeast',
            'southeast' => 'northwest',
            'southwest' => 'northeast',
            'up' => 'down',
            'down' => 'up'
        ];
        
        $oppositeDir = $oppositeDirections[$direction];
        
        // Check if opposite exit already exists
        $stmt = $pdo->prepare("
            SELECT id FROM ow_place_exits 
            WHERE from_place_id = ? AND direction = ?
        ");
        $stmt->execute([$toPlaceId, $oppositeDir]);
        
        if (!$stmt->fetch()) {
            // Create opposite direction exit
            $stmt = $pdo->prepare("
                INSERT INTO ow_place_exits (from_place_id, to_place_id, direction, connection_type)
                VALUES (?, ?, ?, ?)
            ");
            
            try {
                $stmt->execute([
                    $toPlaceId,
                    $fromPlaceId,
                    $oppositeDir,
                    $connectionType
                ]);
            } catch (Exception $e) {
                // If connection_type column doesn't exist, try without it
                $stmt = $pdo->prepare("
                    INSERT INTO ow_place_exits (from_place_id, to_place_id, direction)
                    VALUES (?, ?, ?)
                ");
                $stmt->execute([
                    $toPlaceId,
                    $fromPlaceId,
                    $oppositeDir
                ]);
            }
        }
        
        // After creating the exit, check for vertical stacking opportunities
        // Find all places at the same X,Y coordinates but different Z levels
        $autoStackedPlaces = [];
        
        if (!in_array($direction, ['up', 'down'])) {
            // Only for cardinal directions
            $stmt = $pdo->prepare("
                SELECT id, coord_z FROM ow_places 
                WHERE coord_x = ? AND coord_y = ? AND id != ?
                ORDER BY coord_z ASC
            ");
            $stmt->execute([$toX, $toY, $toPlaceId]);
            $stackedPlaces = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // For each place at this X,Y location, create vertical connections
            foreach ($stackedPlaces as $stackedPlace) {
                $stackedId = $stackedPlace['id'];
                $stackedZ = $stackedPlace['coord_z'];
                
                // Determine which direction: if stacked Z is less, current place is UP from it
                if ($toZ > $stackedZ) {
                    // toPlace is above stackedPlace
                    // Check if UP connection already exists
                    $stmt = $pdo->prepare("
                        SELECT id FROM ow_place_exits 
                        WHERE from_place_id = ? AND direction = 'up'
                    ");
                    $stmt->execute([$stackedId]);
                    
                    if (!$stmt->fetch()) {
                        // Create up connection from lower to higher
                        $stmt = $pdo->prepare("
                            INSERT INTO ow_place_exits (from_place_id, to_place_id, direction, connection_type)
                            VALUES (?, ?, 'up', ?)
                        ");
                        try {
                            $stmt->execute([$stackedId, $toPlaceId, $connectionType]);
                            $autoStackedPlaces[] = $stackedId;
                        } catch (Exception $e) {
                            // Ignore if connection_type column doesn't exist
                        }
                    }
                    
                    // Check if DOWN connection already exists from toPlace
                    $stmt = $pdo->prepare("
                        SELECT id FROM ow_place_exits 
                        WHERE from_place_id = ? AND direction = 'down'
                    ");
                    $stmt->execute([$toPlaceId]);
                    
                    if (!$stmt->fetch()) {
                        // Create down connection from higher to lower
                        $stmt = $pdo->prepare("
                            INSERT INTO ow_place_exits (from_place_id, to_place_id, direction, connection_type)
                            VALUES (?, ?, 'down', ?)
                        ");
                        try {
                            $stmt->execute([$toPlaceId, $stackedId, $connectionType]);
                        } catch (Exception $e) {
                            // Ignore if connection_type column doesn't exist
                        }
                    }
                } else if ($toZ < $stackedZ) {
                    // toPlace is below stackedPlace
                    // Check if UP connection already exists from toPlace
                    $stmt = $pdo->prepare("
                        SELECT id FROM ow_place_exits 
                        WHERE from_place_id = ? AND direction = 'up'
                    ");
                    $stmt->execute([$toPlaceId]);
                    
                    if (!$stmt->fetch()) {
                        // Create up connection from toPlace to stackedPlace
                        $stmt = $pdo->prepare("
                            INSERT INTO ow_place_exits (from_place_id, to_place_id, direction, connection_type)
                            VALUES (?, ?, 'up', ?)
                        ");
                        try {
                            $stmt->execute([$toPlaceId, $stackedId, $connectionType]);
                            $autoStackedPlaces[] = $stackedId;
                        } catch (Exception $e) {
                            // Ignore if connection_type column doesn't exist
                        }
                    }
                    
                    // Check if DOWN connection already exists from stackedPlace
                    $stmt = $pdo->prepare("
                        SELECT id FROM ow_place_exits 
                        WHERE from_place_id = ? AND direction = 'down'
                    ");
                    $stmt->execute([$stackedId]);
                    
                    if (!$stmt->fetch()) {
                        // Create down connection from stackedPlace to toPlace
                        $stmt = $pdo->prepare("
                            INSERT INTO ow_place_exits (from_place_id, to_place_id, direction, connection_type)
                            VALUES (?, ?, 'down', ?)
                        ");
                        try {
                            $stmt->execute([$stackedId, $toPlaceId, $connectionType]);
                        } catch (Exception $e) {
                            // Ignore if connection_type column doesn't exist
                        }
                    }
                }
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Places linked successfully',
            'connection_type' => $connectionType,
            'auto_stacked' => count($autoStackedPlaces) > 0,
            'auto_stacked_count' => count($autoStackedPlaces)
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to insert exit'
        ]);
    }
    exit;
}

function createObject($pdo, $username) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['place_id'] || !$data['name']) {
        throw new Exception('Place ID and object name required');
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO ow_objects (place_id, name, description, created_by)
        VALUES (?, ?, ?, ?)
    ");
    
    $result = $stmt->execute([
        $data['place_id'],
        $data['name'],
        $data['description'] ?? null,
        $username
    ]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'object_id' => $pdo->lastInsertId(),
            'message' => 'Object created successfully'
        ]);
    }
    exit;
}

function addMechanic($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['object_id'] || !$data['type'] || !$data['name']) {
        throw new Exception('Object ID, type, and name required');
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO ow_mechanics (object_id, type, name, description, action_value)
        VALUES (?, ?, ?, ?, ?)
    ");
    
    $result = $stmt->execute([
        $data['object_id'],
        $data['type'],
        $data['name'],
        $data['description'] ?? null,
        isset($data['action_value']) ? json_encode($data['action_value']) : null
    ]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'mechanic_id' => $pdo->lastInsertId(),
            'message' => 'Mechanic added successfully'
        ]);
    }
    exit;
}

function getObjects($pdo) {
    $json_data = json_decode(file_get_contents('php://input'), true);
    $placeId = $json_data['place_id'] ?? $_GET['place_id'] ?? null;
    
    if (!$placeId) {
        throw new Exception('Place ID required');
    }
    
    $stmt = $pdo->prepare("
        SELECT id, name, description, created_at
        FROM ow_objects
        WHERE place_id = ?
        ORDER BY created_at ASC
    ");
    
    $stmt->execute([$placeId]);
    $objects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'objects' => $objects]);
    exit;
}

function getObjectMechanics($pdo) {
    $json_data = json_decode(file_get_contents('php://input'), true);
    $objectId = $json_data['object_id'] ?? null;
    
    if (!$objectId) {
        throw new Exception('Object ID required');
    }
    
    // Get object info
    $stmt = $pdo->prepare("SELECT id, name, description FROM ow_objects WHERE id = ?");
    $stmt->execute([$objectId]);
    $object = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$object) {
        throw new Exception('Object not found');
    }
    
    // Get mechanics for this object
    $stmt = $pdo->prepare("
        SELECT id, type, name, description, action_value
        FROM ow_mechanics
        WHERE object_id = ?
        ORDER BY created_at ASC
    ");
    $stmt->execute([$objectId]);
    $mechanics = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Parse action_value JSON for each mechanic
    foreach ($mechanics as &$mechanic) {
        if ($mechanic['action_value']) {
            $mechanic['action_value'] = json_decode($mechanic['action_value'], true);
        }
    }
    
    echo json_encode(['success' => true, 'object' => $object, 'mechanics' => $mechanics]);
    exit;
}

function deleteMechanic($pdo) {
    $json_data = json_decode(file_get_contents('php://input'), true);
    $mechanicId = $json_data['mechanic_id'] ?? null;
    
    if (!$mechanicId) {
        throw new Exception('Mechanic ID required');
    }
    
    $stmt = $pdo->prepare("DELETE FROM ow_mechanics WHERE id = ?");
    $stmt->execute([$mechanicId]);
    
    echo json_encode(['success' => true, 'message' => 'Mechanic deleted']);
    exit;
}

function cleanupOrphanedExits($pdo) {
    // Delete exits where destination place doesn't exist
    $stmt = $pdo->prepare("
        DELETE FROM ow_place_exits 
        WHERE to_place_id NOT IN (SELECT id FROM ow_places)
    ");
    $stmt->execute();
}

function getExits($pdo) {
    // First clean up any orphaned exits
    cleanupOrphanedExits($pdo);
    
    $json_data = json_decode(file_get_contents('php://input'), true);
    $placeId = $json_data['place_id'] ?? null;
    
    if (!$placeId) {
        throw new Exception('Place ID required');
    }
    
    // Try to select connection_type, fallback to 'full' if column doesn't exist
    $stmt = $pdo->prepare("
        SELECT 
            pe.id,
            pe.direction,
            pe.from_place_id,
            pe.to_place_id,
            p.name as destination_name,
            COALESCE(pe.connection_type, 'full') as connection_type
        FROM ow_place_exits pe
        LEFT JOIN ow_places p ON pe.to_place_id = p.id
        WHERE pe.from_place_id = ?
        ORDER BY pe.direction ASC
    ");
    
    try {
        $stmt->execute([$placeId]);
        $exits = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        // Fallback if connection_type column doesn't exist
        $stmt = $pdo->prepare("
            SELECT 
                pe.id,
                pe.direction,
                pe.from_place_id,
                pe.to_place_id,
                p.name as destination_name,
                'full' as connection_type
            FROM ow_place_exits pe
            LEFT JOIN ow_places p ON pe.to_place_id = p.id
            WHERE pe.from_place_id = ?
            ORDER BY pe.direction ASC
        ");
        $stmt->execute([$placeId]);
        $exits = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    echo json_encode(['success' => true, 'exits' => $exits]);
    exit;
}

function deleteExit($pdo) {
    $json_data = json_decode(file_get_contents('php://input'), true);
    $exitId = $json_data['exit_id'] ?? null;
    
    if (!$exitId) {
        throw new Exception('Exit ID required');
    }
    
    $stmt = $pdo->prepare("DELETE FROM ow_place_exits WHERE id = ?");
    $stmt->execute([$exitId]);
    
    echo json_encode(['success' => true, 'message' => 'Exit deleted']);
    exit;
}

function updateExitType($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['exit_id'] || !$data['connection_type']) {
        throw new Exception('Exit ID and connection type required');
    }
    
    // Validate connection_type
    $validConnectionTypes = ['full', 'passage', 'closed', 'locked', 'no_throughway'];
    if (!in_array($data['connection_type'], $validConnectionTypes)) {
        throw new Exception('Invalid connection type');
    }
    
    // Direction opposites for reverse lookup
    $oppositeDirections = [
        'north' => 'south',
        'south' => 'north',
        'east' => 'west',
        'west' => 'east',
        'northeast' => 'southwest',
        'southwest' => 'northeast',
        'northwest' => 'southeast',
        'southeast' => 'northwest',
        'up' => 'down',
        'down' => 'up'
    ];
    
    // Try to update with connection_type column
    try {
        // First, get the exit details to find the reverse exit
        $stmt = $pdo->prepare("
            SELECT id, from_place_id, to_place_id, direction
            FROM ow_place_exits 
            WHERE id = ?
        ");
        $stmt->execute([$data['exit_id']]);
        $exit = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($exit) {
            // Update the main exit
            $stmt = $pdo->prepare("
                UPDATE ow_place_exits 
                SET connection_type = ? 
                WHERE id = ?
            ");
            $stmt->execute([$data['connection_type'], $data['exit_id']]);
            
            // Find and update the reverse exit if it exists
            $reverseDirection = $oppositeDirections[$exit['direction']] ?? null;
            if ($reverseDirection) {
                $stmt = $pdo->prepare("
                    UPDATE ow_place_exits 
                    SET connection_type = ? 
                    WHERE from_place_id = ? AND to_place_id = ? AND direction = ?
                ");
                $stmt->execute([$data['connection_type'], $exit['to_place_id'], $exit['from_place_id'], $reverseDirection]);
            }
        }
    } catch (Exception $e) {
        // If column doesn't exist, just continue - it will be added to schema later
        // Don't throw an error, just log it
        error_log('connection_type column not available: ' . $e->getMessage());
    }
    
    echo json_encode(['success' => true, 'message' => 'Connection type updated']);
    exit;
}

function ensureConnectionTypeColumn($pdo) {
    try {
        // Check if column exists by trying to select it
        $stmt = $pdo->query("SELECT connection_type FROM ow_place_exits LIMIT 1");
        echo json_encode(['success' => true, 'message' => 'Column already exists']);
        exit;
    } catch (Exception $e) {
        // Column doesn't exist, try to create it
        try {
            $pdo->exec("ALTER TABLE ow_place_exits ADD COLUMN connection_type VARCHAR(20) DEFAULT 'full'");
            echo json_encode(['success' => true, 'message' => 'Column created successfully']);
            exit;
        } catch (Exception $createError) {
            throw new Exception('Failed to create column: ' . $createError->getMessage());
        }
    }
}

function ensureCoordinateColumns($pdo) {
    try {
        // Check if columns exist
        $stmt = $pdo->query("SELECT coord_x, coord_y, coord_z FROM ow_places LIMIT 1");
        echo json_encode(['success' => true, 'message' => 'Coordinate columns already exist']);
        exit;
    } catch (Exception $e) {
        // Columns don't exist, create them
        try {
            $pdo->exec("ALTER TABLE ow_places ADD COLUMN coord_x INT DEFAULT 0");
            $pdo->exec("ALTER TABLE ow_places ADD COLUMN coord_y INT DEFAULT 0");
            $pdo->exec("ALTER TABLE ow_places ADD COLUMN coord_z INT DEFAULT 0");
            echo json_encode(['success' => true, 'message' => 'Coordinate columns created successfully']);
            exit;
        } catch (Exception $createError) {
            throw new Exception('Failed to create coordinate columns: ' . $createError->getMessage());
        }
    }
}

function ensurePlacedColumn($pdo) {
    try {
        // Check if column exists
        $stmt = $pdo->query("SELECT placed FROM ow_places LIMIT 1");
        echo json_encode(['success' => true, 'message' => 'Placed column already exists']);
        exit;
    } catch (Exception $e) {
        // Column doesn't exist, create it
        try {
            $pdo->exec("ALTER TABLE ow_places ADD COLUMN placed TINYINT DEFAULT 0");
            echo json_encode(['success' => true, 'message' => 'Placed column created successfully']);
            exit;
        } catch (Exception $createError) {
            throw new Exception('Failed to create placed column: ' . $createError->getMessage());
        }
    }
}

function ensureQuestTables($pdo) {
    try {
        // Check if tables exist
        $stmt = $pdo->query("SELECT 1 FROM ow_quests LIMIT 1");
        
        // Tables exist, check if linked_place_id column exists
        try {
            $pdo->query("SELECT linked_place_id FROM ow_quest_tasks LIMIT 1");
            // Column exists, we're good
            echo json_encode(['success' => true, 'message' => 'Quest tables already exist']);
        } catch (Exception $e) {
            // Column doesn't exist, add it
            $pdo->exec("ALTER TABLE ow_quest_tasks ADD COLUMN linked_place_id INT AFTER quest_id");
            $pdo->exec("ALTER TABLE ow_quest_tasks ADD COLUMN placed TINYINT DEFAULT 0 AFTER linked_place_id");
            $pdo->exec("ALTER TABLE ow_quest_tasks ADD FOREIGN KEY (linked_place_id) REFERENCES ow_places(id) ON DELETE SET NULL");
            echo json_encode(['success' => true, 'message' => 'Quest tables updated']);
        }
        exit;
    } catch (Exception $e) {
        // Tables don't exist, create them
        try {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS ow_quests (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    world_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    quest_type ENUM('main', 'side') DEFAULT 'side',
                    created_by VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (world_id) REFERENCES ow_worlds(id) ON DELETE CASCADE
                )
            ");
            
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS ow_quest_tasks (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    quest_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    type ENUM('main', 'side') DEFAULT 'side',
                    is_required TINYINT DEFAULT 0,
                    linked_place_id INT,
                    placed TINYINT DEFAULT 0,
                    linked_object_id INT,
                    task_order INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (quest_id) REFERENCES ow_quests(id) ON DELETE CASCADE,
                    FOREIGN KEY (linked_place_id) REFERENCES ow_places(id) ON DELETE SET NULL,
                    FOREIGN KEY (linked_object_id) REFERENCES ow_objects(id) ON DELETE SET NULL
                )
            ");
            
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS ow_quest_task_links (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    from_task_id INT NOT NULL,
                    to_task_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (from_task_id) REFERENCES ow_quest_tasks(id) ON DELETE CASCADE,
                    FOREIGN KEY (to_task_id) REFERENCES ow_quest_tasks(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_link (from_task_id, to_task_id)
                )
            ");
            
            error_log("[ensureQuestTables] Quest tables created successfully");
            echo json_encode(['success' => true, 'message' => 'Quest tables created successfully']);
            exit;
        } catch (Exception $createError) {
            throw new Exception('Failed to create quest tables: ' . $createError->getMessage());
        }
    }
}

function createQuest($pdo, $username) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['world_id'] || !$data['name']) {
        throw new Exception('World ID and quest name required');
    }
    
    $questType = $data['quest_type'] ?? 'side';
    if (!in_array($questType, ['main', 'side'])) {
        $questType = 'side';
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO ow_quests (world_id, name, description, quest_type, created_by)
        VALUES (?, ?, ?, ?, ?)
    ");
    
    $result = $stmt->execute([
        $data['world_id'],
        $data['name'],
        $data['description'] ?? null,
        $questType,
        $username
    ]);
    
    if ($result) {
        error_log("[createQuest] Quest created: {$data['name']} (type: $questType) by $username");
        echo json_encode([
            'success' => true,
            'quest_id' => $pdo->lastInsertId(),
            'message' => 'Quest created successfully'
        ]);
    } else {
        throw new Exception('Failed to create quest');
    }
    exit;
}

function getQuests($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $worldId = $data['world_id'] ?? $_GET['world_id'] ?? null;
    
    if (!$worldId) {
        throw new Exception('World ID required');
    }
    
    $stmt = $pdo->prepare("
        SELECT id, name, description, quest_type, created_at
        FROM ow_quests
        WHERE world_id = ?
        ORDER BY quest_type DESC, created_at ASC
    ");
    
    $stmt->execute([$worldId]);
    $quests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'quests' => $quests]);
    exit;
}

function createQuestTask($pdo, $username) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['quest_id'] || !$data['name']) {
        throw new Exception('Quest ID and task name required');
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO ow_quest_tasks (quest_id, name, description, is_required, linked_place_id, linked_object_id, task_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    
    $result = $stmt->execute([
        $data['quest_id'],
        $data['name'],
        $data['description'] ?? null,
        $data['is_required'] ?? 0,
        $data['linked_place_id'] ?? null,
        $data['linked_object_id'] ?? null,
        $data['task_order'] ?? 0
    ]);
    
    if ($result) {
        $taskId = $pdo->lastInsertId();
        error_log("[createQuestTask] Task created: {$data['name']} for quest {$data['quest_id']}");
        echo json_encode([
            'success' => true,
            'task_id' => $taskId,
            'message' => 'Task created successfully'
        ]);
    } else {
        throw new Exception('Failed to create quest task');
    }
    exit;
}

function getQuestTasks($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $questId = $data['quest_id'] ?? $_GET['quest_id'] ?? null;
    
    if (!$questId) {
        throw new Exception('Quest ID required');
    }
    
    $stmt = $pdo->prepare("
        SELECT id, quest_id, name, description, is_required, linked_place_id, linked_object_id, task_order, created_at
        FROM ow_quest_tasks
        WHERE quest_id = ?
        ORDER BY task_order ASC, created_at ASC
    ");
    
    $stmt->execute([$questId]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // For each task, get its linked tasks
    foreach ($tasks as &$task) {
        $linkStmt = $pdo->prepare("
            SELECT to_task_id FROM ow_quest_task_links WHERE from_task_id = ?
        ");
        $linkStmt->execute([$task['id']]);
        $task['linked_tasks'] = $linkStmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    echo json_encode(['success' => true, 'tasks' => $tasks]);
    exit;
}

function linkQuestTasks($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['from_task_id'] || !$data['to_task_id']) {
        throw new Exception('From task ID and to task ID required');
    }
    
    // Prevent self-linking
    if ($data['from_task_id'] == $data['to_task_id']) {
        throw new Exception('Cannot link a task to itself');
    }
    
    // Check if link already exists
    $stmt = $pdo->prepare("
        SELECT id FROM ow_quest_task_links 
        WHERE from_task_id = ? AND to_task_id = ?
    ");
    $stmt->execute([$data['from_task_id'], $data['to_task_id']]);
    
    if ($stmt->fetch()) {
        throw new Exception('This link already exists');
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO ow_quest_task_links (from_task_id, to_task_id)
        VALUES (?, ?)
    ");
    
    $result = $stmt->execute([
        $data['from_task_id'],
        $data['to_task_id']
    ]);
    
    if ($result) {
        error_log("[linkQuestTasks] Tasks linked: {$data['from_task_id']} -> {$data['to_task_id']}");
        echo json_encode([
            'success' => true,
            'message' => 'Tasks linked successfully'
        ]);
    } else {
        throw new Exception('Failed to link tasks');
    }
    exit;
}

function deleteQuestTask($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['task_id']) {
        throw new Exception('Task ID required');
    }
    
    // Delete all links involving this task
    $stmt = $pdo->prepare("DELETE FROM ow_quest_task_links WHERE from_task_id = ? OR to_task_id = ?");
    $stmt->execute([$data['task_id'], $data['task_id']]);
    
    // Delete the task
    $stmt = $pdo->prepare("DELETE FROM ow_quest_tasks WHERE id = ?");
    $result = $stmt->execute([$data['task_id']]);
    
    if ($result) {
        error_log("[deleteQuestTask] Task deleted: {$data['task_id']}");
        echo json_encode(['success' => true, 'message' => 'Task deleted successfully']);
    } else {
        throw new Exception('Failed to delete task');
    }
    exit;
}

function deleteQuestTaskLink($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['from_task_id'] || !$data['to_task_id']) {
        throw new Exception('From task ID and to task ID required');
    }
    
    $stmt = $pdo->prepare("
        DELETE FROM ow_quest_task_links 
        WHERE from_task_id = ? AND to_task_id = ?
    ");
    
    $result = $stmt->execute([
        $data['from_task_id'],
        $data['to_task_id']
    ]);
    
    if ($result) {
        error_log("[deleteQuestTaskLink] Link deleted: {$data['from_task_id']} -> {$data['to_task_id']}");
        echo json_encode(['success' => true, 'message' => 'Link deleted successfully']);
    } else {
        throw new Exception('Failed to delete link');
    }
    exit;
}

function deleteQuest($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['quest_id']) {
        throw new Exception('Quest ID required');
    }
    
    // Delete all tasks and their links (cascade handled by foreign keys)
    $stmt = $pdo->prepare("DELETE FROM ow_quests WHERE id = ?");
    $result = $stmt->execute([$data['quest_id']]);
    
    if ($result) {
        error_log("[deleteQuest] Quest deleted: {$data['quest_id']}");
        echo json_encode(['success' => true, 'message' => 'Quest deleted successfully']);
    } else {
        throw new Exception('Failed to delete quest');
    }
    exit;
}

// ===== Place Quest Task Assignment Functions =====

function assignTaskToPlace($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['task_id'] || !$data['place_id']) {
        throw new Exception('Task ID and Place ID required');
    }
    
    $task_id = (int)$data['task_id'];
    $place_id = (int)$data['place_id'];
    
    // Update the task to link it to the place
    $stmt = $pdo->prepare("
        UPDATE ow_quest_tasks 
        SET linked_place_id = ?
        WHERE id = ?
    ");
    
    $result = $stmt->execute([$place_id, $task_id]);
    
    if ($result) {
        error_log("[assignTaskToPlace] Task $task_id assigned to place $place_id");
        echo json_encode(['success' => true, 'message' => 'Task assigned to place']);
    } else {
        throw new Exception('Failed to assign task to place');
    }
    exit;
}

function unassignTaskFromPlace($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['task_id']) {
        throw new Exception('Task ID required');
    }
    
    $task_id = (int)$data['task_id'];
    
    // Clear the place link
    $stmt = $pdo->prepare("
        UPDATE ow_quest_tasks 
        SET linked_place_id = NULL
        WHERE id = ?
    ");
    
    $result = $stmt->execute([$task_id]);
    
    if ($result) {
        error_log("[unassignTaskFromPlace] Task $task_id unassigned from place");
        echo json_encode(['success' => true, 'message' => 'Task removed from place']);
    } else {
        throw new Exception('Failed to unassign task from place');
    }
    exit;
}

function getPlaceQuestTasks($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['place_id']) {
        throw new Exception('Place ID required');
    }
    
    $place_id = (int)$data['place_id'];
    
    $stmt = $pdo->prepare("
        SELECT 
            qt.id,
            qt.name,
            qt.description,
            q.id as quest_id,
            q.name as quest_name,
            q.quest_type
        FROM ow_quest_tasks qt
        JOIN ow_quests q ON qt.quest_id = q.id
        WHERE qt.linked_place_id = ?
        ORDER BY q.name, qt.name
    ");
    
    $stmt->execute([$place_id]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("[getPlaceQuestTasks] Found " . count($tasks) . " tasks for place $place_id");
    echo json_encode(['success' => true, 'tasks' => $tasks]);
    exit;
}