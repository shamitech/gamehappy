<?php
// Open World Admin API
session_start();

// Check if admin is logged in
if (!isset($_SESSION['admin_logged_in']) || !$_SESSION['admin_logged_in']) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized - Admin login required']);
    exit;
}

header('Content-Type: application/json');

// Database connection
$db = new mysqli('localhost', 'root', '', 'gamehappy');
if ($db->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Get request
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;

try {
    switch ($action) {
        case 'create_world':
            handleCreateWorld($db, $input, $_SESSION['admin_username']);
            break;
        
        case 'get_worlds':
            handleGetWorlds($db, $_SESSION['admin_username']);
            break;
        
        case 'create_place':
            handleCreatePlace($db, $input, $_SESSION['admin_username']);
            break;
        
        case 'get_places':
            handleGetPlaces($db, $input);
            break;
        
        case 'link_places':
            handleLinkPlaces($db, $input);
            break;
        
        case 'create_object':
            handleCreateObject($db, $input, $_SESSION['admin_username']);
            break;
        
        case 'get_objects':
            handleGetObjects($db, $input);
            break;
        
        case 'add_mechanic':
            handleAddMechanic($db, $input);
            break;
        
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

// HANDLERS

function handleCreateWorld($db, $input, $username) {
    $name = $input['name'] ?? '';
    $description = $input['description'] ?? '';
    $is_public = $input['is_public'] ?? 0;

    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'World name required']);
        return;
    }

    $stmt = $db->prepare('INSERT INTO ow_worlds (name, description, created_by, is_public) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('sssi', $name, $description, $username, $is_public);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'World created', 'world_id' => $stmt->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error creating world']);
    }
    $stmt->close();
}

function handleGetWorlds($db, $username) {
    $query = 'SELECT w.*, COUNT(p.id) as place_count 
              FROM ow_worlds w 
              LEFT JOIN ow_places p ON w.id = p.world_id 
              WHERE w.created_by = ? 
              GROUP BY w.id 
              ORDER BY w.created_at DESC';
    
    $stmt = $db->prepare($query);
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $worlds = [];
    while ($row = $result->fetch_assoc()) {
        $worlds[] = $row;
    }
    
    echo json_encode(['success' => true, 'worlds' => $worlds]);
    $stmt->close();
}

function handleCreatePlace($db, $input, $username) {
    $world_id = $input['world_id'] ?? 0;
    $name = $input['name'] ?? '';
    $description = $input['description'] ?? '';

    if (empty($world_id) || empty($name)) {
        echo json_encode(['success' => false, 'message' => 'World ID and place name required']);
        return;
    }

    // Verify ownership
    $stmt = $db->prepare('SELECT id FROM ow_worlds WHERE id = ? AND created_by = ?');
    $stmt->bind_param('is', $world_id, $username);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'World not found or access denied']);
        $stmt->close();
        return;
    }
    $stmt->close();

    $stmt = $db->prepare('INSERT INTO ow_places (world_id, name, description, created_by) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('isss', $world_id, $name, $description, $username);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Place created', 'place_id' => $stmt->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error creating place']);
    }
    $stmt->close();
}

function handleGetPlaces($db, $input) {
    $world_id = $input['world_id'] ?? 0;

    if (empty($world_id)) {
        echo json_encode(['success' => false, 'message' => 'World ID required']);
        return;
    }

    $stmt = $db->prepare('SELECT * FROM ow_places WHERE world_id = ? ORDER BY created_at DESC');
    $stmt->bind_param('i', $world_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $places = [];
    while ($row = $result->fetch_assoc()) {
        $places[] = $row;
    }
    
    echo json_encode(['success' => true, 'places' => $places]);
    $stmt->close();
}

function handleLinkPlaces($db, $input) {
    $from_place_id = $input['from_place_id'] ?? 0;
    $to_place_id = $input['to_place_id'] ?? 0;
    $direction = $input['direction'] ?? '';

    $valid_directions = ['north', 'south', 'east', 'west', 'up', 'down'];
    if (!in_array($direction, $valid_directions)) {
        echo json_encode(['success' => false, 'message' => 'Invalid direction']);
        return;
    }

    // Check if exit already exists
    $stmt = $db->prepare('SELECT id FROM ow_place_exits WHERE from_place_id = ? AND direction = ?');
    $stmt->bind_param('is', $from_place_id, $direction);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Exit already exists in that direction']);
        $stmt->close();
        return;
    }
    $stmt->close();

    $stmt = $db->prepare('INSERT INTO ow_place_exits (from_place_id, to_place_id, direction) VALUES (?, ?, ?)');
    $stmt->bind_param('iis', $from_place_id, $to_place_id, $direction);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Places linked']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error linking places']);
    }
    $stmt->close();
}

function handleCreateObject($db, $input, $username) {
    $place_id = $input['place_id'] ?? 0;
    $name = $input['name'] ?? '';
    $description = $input['description'] ?? '';

    if (empty($place_id) || empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Place ID and object name required']);
        return;
    }

    $stmt = $db->prepare('INSERT INTO ow_objects (place_id, name, description, created_by) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('isss', $place_id, $name, $description, $username);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Object created', 'object_id' => $stmt->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error creating object']);
    }
    $stmt->close();
}

function handleGetObjects($db, $input) {
    $place_id = $input['place_id'] ?? 0;

    if (empty($place_id)) {
        echo json_encode(['success' => false, 'message' => 'Place ID required']);
        return;
    }

    $stmt = $db->prepare('SELECT * FROM ow_objects WHERE place_id = ? ORDER BY created_at DESC');
    $stmt->bind_param('i', $place_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $objects = [];
    while ($row = $result->fetch_assoc()) {
        $objects[] = $row;
    }
    
    echo json_encode(['success' => true, 'objects' => $objects]);
    $stmt->close();
}

function handleAddMechanic($db, $input) {
    $object_id = $input['object_id'] ?? 0;
    $type = $input['type'] ?? '';
    $name = $input['name'] ?? '';
    $description = $input['description'] ?? '';
    $action_value = $input['action_value'] ?? '{}';

    if (empty($object_id) || empty($type) || empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        return;
    }

    $valid_types = ['open', 'examine', 'take', 'use', 'teleport', 'create_area', 'trigger'];
    if (!in_array($type, $valid_types)) {
        echo json_encode(['success' => false, 'message' => 'Invalid mechanic type']);
        return;
    }

    $stmt = $db->prepare('INSERT INTO ow_mechanics (object_id, type, name, description, action_value) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('issss', $object_id, $type, $name, $description, $action_value);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Mechanic added']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error adding mechanic']);
    }
    $stmt->close();
}

// Helper function
function isAdmin($user_id) {
    // Session-based authentication - already verified above
    return true;
}

$db->close();
?>
