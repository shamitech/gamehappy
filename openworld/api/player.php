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
        case 'execute_mechanic':
            executeMechanic($pdo, $input);
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

function executeMechanic($pdo, $input) {
    $playerId = $input['player_id'] ?? null;
    $mechanicId = $input['mechanic_id'] ?? null;
    $objectId = $input['object_id'] ?? null;
    $placeId = $input['place_id'] ?? null;

    if (!$playerId || !$mechanicId || !$objectId) {
        echo json_encode(['success' => false, 'message' => 'Player ID, Mechanic ID, and Object ID required']);
        return;
    }

    try {
        // Get mechanic details
        $stmt = $pdo->prepare('
            SELECT m.id, m.type, m.name, m.description, m.action_value
            FROM ow_mechanics m
            WHERE m.id = ?
        ');
        $stmt->execute([$mechanicId]);
        $mechanic = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$mechanic) {
            echo json_encode(['success' => false, 'message' => 'Mechanic not found']);
            return;
        }

        // Parse action_value JSON
        $actionValue = $mechanic['action_value'] ? json_decode($mechanic['action_value'], true) : [];

        // Log the mechanic execution (could be useful for quest tracking)
        error_log("[executeMechanic] Player $playerId executed mechanic $mechanicId ({$mechanic['type']}) on object $objectId");

        // Step 1: Check if this mechanic completes any tasks assigned to this place
        $completedTasks = [];
        if ($placeId) {
            $stmt = $pdo->prepare('
                SELECT DISTINCT qt.id, qt.name, q.id as quest_id, q.name as quest_name
                FROM ow_quest_tasks qt
                JOIN ow_quests q ON qt.quest_id = q.id
                JOIN ow_task_mechanics tm ON qt.id = tm.task_id
                WHERE tm.mechanic_id = ? 
                  AND qt.linked_place_id = ?
                  AND qt.id NOT IN (
                    SELECT task_id FROM ow_completed_tasks 
                    WHERE player_id = ?
                  )
            ');
            $stmt->execute([$mechanicId, $placeId, $playerId]);
            $completedTasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // Step 2: Mark tasks as completed for this player
        $markedTasks = [];
        if (count($completedTasks) > 0) {
            foreach ($completedTasks as $task) {
                try {
                    // Check if table exists, create if not
                    try {
                        $pdo->query("SELECT 1 FROM ow_completed_tasks LIMIT 1");
                    } catch (PDOException $e) {
                        $pdo->exec("
                            CREATE TABLE IF NOT EXISTS ow_completed_tasks (
                                id INT PRIMARY KEY AUTO_INCREMENT,
                                player_id INT NOT NULL,
                                task_id INT NOT NULL,
                                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (player_id) REFERENCES ow_players(id) ON DELETE CASCADE,
                                FOREIGN KEY (task_id) REFERENCES ow_quest_tasks(id) ON DELETE CASCADE,
                                UNIQUE KEY unique_player_task (player_id, task_id)
                            )
                        ");
                    }

                    $stmt = $pdo->prepare("
                        INSERT INTO ow_completed_tasks (player_id, task_id)
                        VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE completed_at = NOW()
                    ");
                    $stmt->execute([$playerId, $task['id']]);
                    $markedTasks[] = $task;
                    
                    error_log("[executeMechanic] Task {$task['id']} ({$task['name']}) marked complete for player $playerId");
                } catch (PDOException $e) {
                    error_log("[executeMechanic] Error marking task complete: " . $e->getMessage());
                }
            }
        }

        // Step 3: Check for kickback tasks that should be triggered
        $kickbackTasks = [];
        if (count($markedTasks) > 0) {
            foreach ($markedTasks as $completedTask) {
                $stmt = $pdo->prepare('
                    SELECT 
                        tk.id,
                        tk.kickback_task_id,
                        kt.id as task_id,
                        kt.name,
                        kt.description,
                        q.id as quest_id,
                        q.name as quest_name,
                        tk.priority
                    FROM ow_task_kickbacks tk
                    JOIN ow_quest_tasks kt ON tk.kickback_task_id = kt.id
                    JOIN ow_quests q ON kt.quest_id = q.id
                    WHERE tk.original_task_id = ? AND tk.is_enabled = 1
                    ORDER BY tk.priority DESC
                ');
                $stmt->execute([$completedTask['id']]);
                $possibleKickbacks = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (count($possibleKickbacks) > 0) {
                    // Randomly select one kickback (priority weighted if multiple)
                    $selectedKickback = $possibleKickbacks[0];
                    
                    // Add to player's active tasks (if tracking system exists)
                    // For now, just return the kickback info
                    $kickbackTasks[] = $selectedKickback;
                    
                    error_log("[executeMechanic] Kickback task triggered: {$selectedKickback['name']} (quest: {$selectedKickback['quest_name']})");
                }
            }
        }

        // Return success with completed tasks and any triggered kickbacks
        echo json_encode([
            'success' => true,
            'message' => $mechanic['description'] ?? 'Action completed',
            'mechanic' => [
                'id' => $mechanic['id'],
                'type' => $mechanic['type'],
                'name' => $mechanic['name']
            ],
            'completed_tasks' => $markedTasks,
            'kickback_tasks' => $kickbackTasks
        ]);

    } catch (PDOException $e) {
        error_log("[executeMechanic] Database error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to execute mechanic']);
    }
    exit;
}
?>
