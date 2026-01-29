<?php
/**
 * Open World Game - Admin API
 * Handles world and place creation
 */

header('Content-Type: application/json');
require_once '../../auth/check-session.php';

// Check if user is admin
function isAdmin($userId) {
    global $pdo;
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    return $user && $user['role'] === 'admin';
}

$action = $_GET['action'] ?? null;
$userId = $_SESSION['user_id'] ?? null;

if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

if (!isAdmin($userId)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required']);
    exit;
}

try {
    switch ($action) {
        case 'create_world':
            createWorld($pdo, $userId);
            break;
        case 'get_worlds':
            getWorlds($pdo);
            break;
        case 'create_place':
            createPlace($pdo, $userId);
            break;
        case 'get_places':
            getPlaces($pdo);
            break;
        case 'link_places':
            linkPlaces($pdo);
            break;
        case 'create_object':
            createObject($pdo, $userId);
            break;
        case 'add_mechanic':
            addMechanic($pdo);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function createWorld($pdo, $userId) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['name']) {
        throw new Exception('World name required');
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO ow_worlds (name, description, created_by, is_public)
        VALUES (?, ?, ?, ?)
    ");
    
    $result = $stmt->execute([
        $data['name'],
        $data['description'] ?? null,
        $userId,
        $data['is_public'] ?? false
    ]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'world_id' => $pdo->lastInsertId(),
            'message' => 'World created successfully'
        ]);
    }
}

function getWorlds($pdo) {
    $stmt = $pdo->prepare("
        SELECT id, name, description, created_at, is_public,
               (SELECT COUNT(*) FROM ow_places WHERE world_id = ow_worlds.id) as place_count
        FROM ow_worlds
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $worlds = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'worlds' => $worlds]);
}

function createPlace($pdo, $userId) {
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
        $userId
    ]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'place_id' => $pdo->lastInsertId(),
            'message' => 'Place created successfully'
        ]);
    }
}

function getPlaces($pdo) {
    $worldId = $_GET['world_id'] ?? null;
    
    if (!$worldId) {
        throw new Exception('World ID required');
    }
    
    $stmt = $pdo->prepare("
        SELECT id, name, description, created_at
        FROM ow_places
        WHERE world_id = ?
        ORDER BY created_at ASC
    ");
    
    $stmt->execute([$worldId]);
    $places = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'places' => $places]);
}

function linkPlaces($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data['from_place_id'] || !$data['to_place_id'] || !$data['direction']) {
        throw new Exception('From place, to place, and direction required');
    }
    
    // Validate direction
    $validDirections = ['north', 'south', 'east', 'west', 'up', 'down'];
    if (!in_array(strtolower($data['direction']), $validDirections)) {
        throw new Exception('Invalid direction');
    }
    
    // Check if exit already exists
    $stmt = $pdo->prepare("
        SELECT id FROM ow_place_exits 
        WHERE from_place_id = ? AND direction = ?
    ");
    $stmt->execute([$data['from_place_id'], strtolower($data['direction'])]);
    
    if ($stmt->fetch()) {
        throw new Exception('Exit already exists in that direction');
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO ow_place_exits (from_place_id, to_place_id, direction)
        VALUES (?, ?, ?)
    ");
    
    $result = $stmt->execute([
        $data['from_place_id'],
        $data['to_place_id'],
        strtolower($data['direction'])
    ]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Places linked successfully'
        ]);
    }
}

function createObject($pdo, $userId) {
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
        $userId
    ]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'object_id' => $pdo->lastInsertId(),
            'message' => 'Object created successfully'
        ]);
    }
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
}
