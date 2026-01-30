<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database connection
try {
    $pdo = new PDO(
        'mysql:host=localhost;dbname=gamehappy',
        'gamehappy',
        'GameHappy2026',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;

try {
    switch ($action) {
        case 'register_player':
            registerPlayer($pdo, $input);
            break;
        case 'login_player':
            loginPlayer($pdo, $input);
            break;
        case 'get_player':
            getPlayer($pdo, $input);
            break;
        case 'get_available_objects':
            getAvailableObjects($pdo, $input);
            break;
        case 'purchase_object':
            purchaseObject($pdo, $input);
            break;
        case 'get_player_inventory':
            getPlayerInventory($pdo, $input);
            break;
        case 'move_player':
            movePlayer($pdo, $input);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Unknown action']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function registerPlayer($pdo, $input) {
    $username = $input['username'] ?? null;
    $password = $input['password'] ?? null;

    if (!$username || !$password) {
        echo json_encode(['success' => false, 'message' => 'Username and password required']);
        return;
    }

    if (strlen($username) < 3 || strlen($password) < 4) {
        echo json_encode(['success' => false, 'message' => 'Username must be 3+ chars, password 4+ chars']);
        return;
    }

    try {
        // Check if username exists
        $stmt = $pdo->prepare('SELECT id FROM ow_players WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Username already exists']);
            return;
        }

        // Create player
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO ow_players (username, password_hash, gold) VALUES (?, ?, 1000)');
        $stmt->execute([$username, $passwordHash]);

        $playerId = $pdo->lastInsertId();
        echo json_encode([
            'success' => true,
            'message' => 'Player registered',
            'player_id' => $playerId,
            'username' => $username,
            'gold' => 1000
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Registration failed']);
    }
    exit;
}

function loginPlayer($pdo, $input) {
    $username = $input['username'] ?? null;
    $password = $input['password'] ?? null;

    if (!$username || !$password) {
        echo json_encode(['success' => false, 'message' => 'Username and password required']);
        return;
    }

    try {
        $stmt = $pdo->prepare('SELECT id, password_hash, gold, current_place_id FROM ow_players WHERE username = ?');
        $stmt->execute([$username]);
        $player = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$player || !password_verify($password, $player['password_hash'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
            return;
        }

        echo json_encode([
            'success' => true,
            'player_id' => $player['id'],
            'username' => $username,
            'gold' => $player['gold'],
            'current_place_id' => $player['current_place_id']
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Login failed']);
    }
    exit;
}

function getPlayer($pdo, $input) {
    $playerId = $input['player_id'] ?? null;

    if (!$playerId) {
        echo json_encode(['success' => false, 'message' => 'Player ID required']);
        return;
    }

    try {
        $stmt = $pdo->prepare('SELECT id, username, gold, current_place_id FROM ow_players WHERE id = ?');
        $stmt->execute([$playerId]);
        $player = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$player) {
            echo json_encode(['success' => false, 'message' => 'Player not found']);
            return;
        }

        echo json_encode([
            'success' => true,
            'player' => $player
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to get player']);
    }
    exit;
}

function getAvailableObjects($pdo, $input) {
    $placeId = $input['place_id'] ?? null;

    if (!$placeId) {
        echo json_encode(['success' => false, 'message' => 'Place ID required']);
        return;
    }

    try {
        // Get objects in place that have purchase mechanic
        $stmt = $pdo->prepare('
            SELECT o.id, o.name, o.description, 
                   m.action_value,
                   CASE WHEN ow.player_id IS NOT NULL THEN ow.player_id ELSE NULL END as owner_id
            FROM ow_objects o
            LEFT JOIN ow_mechanics m ON o.id = m.object_id AND m.type = "purchase"
            LEFT JOIN ow_ownership ow ON o.id = ow.object_id
            WHERE o.place_id = ?
            ORDER BY o.name
        ');
        $stmt->execute([$placeId]);
        $objects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Parse action_value JSON for each object
        foreach ($objects as &$obj) {
            if ($obj['action_value']) {
                $obj['purchase_info'] = json_decode($obj['action_value'], true);
            }
            unset($obj['action_value']);
        }

        echo json_encode([
            'success' => true,
            'objects' => $objects
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to get objects']);
    }
    exit;
}

function purchaseObject($pdo, $input) {
    $playerId = $input['player_id'] ?? null;
    $objectId = $input['object_id'] ?? null;

    if (!$playerId || !$objectId) {
        echo json_encode(['success' => false, 'message' => 'Player ID and Object ID required']);
        return;
    }

    try {
        $pdo->beginTransaction();

        // Get player info
        $stmt = $pdo->prepare('SELECT gold FROM ow_players WHERE id = ?');
        $stmt->execute([$playerId]);
        $player = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$player) {
            throw new Exception('Player not found');
        }

        // Get object and place info
        $stmt = $pdo->prepare('SELECT o.id, o.place_id, m.action_value FROM ow_objects o 
                              LEFT JOIN ow_mechanics m ON o.id = m.object_id AND m.type = "purchase"
                              WHERE o.id = ?');
        $stmt->execute([$objectId]);
        $object = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$object) {
            throw new Exception('Object not found');
        }

        // Check if already owned
        $stmt = $pdo->prepare('SELECT player_id FROM ow_ownership WHERE object_id = ? LIMIT 1');
        $stmt->execute([$objectId]);
        $owned = $stmt->fetch();

        if ($owned) {
            throw new Exception('Object already owned');
        }

        // Get purchase price
        $purchaseInfo = json_decode($object['action_value'], true) ?? [];
        $price = $purchaseInfo['gold_price'] ?? 0;

        if ($player['gold'] < $price) {
            throw new Exception('Not enough gold');
        }

        // Deduct gold
        $newBalance = $player['gold'] - $price;
        $stmt = $pdo->prepare('UPDATE ow_players SET gold = ? WHERE id = ?');
        $stmt->execute([$newBalance, $playerId]);

        // Create ownership record
        $stmt = $pdo->prepare('
            INSERT INTO ow_ownership (object_id, player_id, original_place_id)
            VALUES (?, ?, ?)
        ');
        $stmt->execute([$objectId, $playerId, $object['place_id']]);

        // Record transaction
        $stmt = $pdo->prepare('
            INSERT INTO ow_transactions (player_id, type, amount, balance_after, object_id, description)
            VALUES (?, "purchase", ?, ?, ?, ?)
        ');
        $stmt->execute([
            $playerId,
            -$price,
            $newBalance,
            $objectId,
            'Purchased: ' . ($purchaseInfo['name'] ?? 'Object')
        ]);

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Object purchased',
            'gold_spent' => $price,
            'new_balance' => $newBalance
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

function getPlayerInventory($pdo, $input) {
    $playerId = $input['player_id'] ?? null;

    if (!$playerId) {
        echo json_encode(['success' => false, 'message' => 'Player ID required']);
        return;
    }

    try {
        $stmt = $pdo->prepare('
            SELECT o.id, o.name, o.description, ow.acquired_at
            FROM ow_ownership ow
            JOIN ow_objects o ON ow.object_id = o.id
            WHERE ow.player_id = ?
            ORDER BY ow.acquired_at DESC
        ');
        $stmt->execute([$playerId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'items' => $items
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to get inventory']);
    }
    exit;
}

function movePlayer($pdo, $input) {
    $playerId = $input['player_id'] ?? null;
    $placeId = $input['place_id'] ?? null;

    if (!$playerId || !$placeId) {
        echo json_encode(['success' => false, 'message' => 'Player ID and Place ID required']);
        return;
    }

    try {
        $stmt = $pdo->prepare('UPDATE ow_players SET current_place_id = ? WHERE id = ?');
        $stmt->execute([$placeId, $playerId]);

        echo json_encode([
            'success' => true,
            'message' => 'Player moved',
            'current_place_id' => $placeId
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to move player']);
    }
    exit;
}
?>
