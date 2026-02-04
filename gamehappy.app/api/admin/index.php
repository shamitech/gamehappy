<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$request_method = $_SERVER['REQUEST_METHOD'];

// Route the request
if (strpos($request_uri, '/api/admin/stats') !== false) {
    handleStats();
} elseif (strpos($request_uri, '/api/admin/messages') !== false) {
    handleMessages();
} elseif (strpos($request_uri, '/api/admin/games') !== false) {
    handleGames();
} elseif (strpos($request_uri, '/api/admin/clear-old-games') !== false && $request_method === 'POST') {
    handleClearOldGames();
} elseif (strpos($request_uri, '/api/admin/export') !== false) {
    handleExport();
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
}

function handleStats() {
    $data_dir = '/var/www/gamehappy.app/data';
    $contact_dir = $data_dir . '/contact-submissions';
    
    // Get contact message count
    $messages_count = 0;
    if (is_dir($contact_dir)) {
        $messages_count = count(glob($contact_dir . '/*.json'));
    }

    // Get stats from game-history if available
    $game_history_file = '/var/www/gamehappy.app/data/game-history.json';
    $ss_stats = [
        'total' => 0,
        'active' => 0,
        'rounds' => 0,
        'players' => 0
    ];

    if (file_exists($game_history_file)) {
        $history = json_decode(file_get_contents($game_history_file), true);
        if ($history && isset($history['secret_syndicates'])) {
            $ss_games = $history['secret_syndicates'];
            $ss_stats['total'] = count($ss_games);
            
            // Count active games (within last 30 minutes)
            $now = time();
            $active_count = 0;
            $total_rounds = 0;
            $unique_players = [];
            
            foreach ($ss_games as $game) {
                $game_time = strtotime($game['created_at'] ?? 'now');
                if ($now - $game_time < 1800) {
                    $active_count++;
                }
                $total_rounds += $game['rounds'] ?? 0;
                foreach ($game['players'] ?? [] as $player) {
                    $unique_players[$player] = true;
                }
            }
            
            $ss_stats['active'] = $active_count;
            $ss_stats['rounds'] = $total_rounds;
            $ss_stats['players'] = count($unique_players);
        }
    }

    $response = [
        'activeUsers' => rand(5, 50), // Would come from real session tracking
        'activeGames' => $ss_stats['active'],
        'messages' => $messages_count,
        'ss_total' => $ss_stats['total'],
        'ss_active' => $ss_stats['active'],
        'ss_rounds' => $ss_stats['rounds'],
        'ss_players' => $ss_stats['players'],
        'timestamp' => date('Y-m-d H:i:s')
    ];

    echo json_encode($response);
}

function handleMessages() {
    $contact_dir = '/var/www/gamehappy.app/data/contact-submissions';
    $messages = [];

    if (is_dir($contact_dir)) {
        $files = glob($contact_dir . '/*.json');
        foreach ($files as $file) {
            $content = json_decode(file_get_contents($file), true);
            if ($content) {
                $messages[] = $content;
            }
        }
    }

    echo json_encode([
        'messages' => $messages,
        'count' => count($messages),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

function handleGames() {
    $game_history_file = '/var/www/gamehappy.app/data/game-history.json';
    $games = [];

    if (file_exists($game_history_file)) {
        $history = json_decode(file_get_contents($game_history_file), true);
        $games = $history ?? [];
    }

    echo json_encode([
        'games' => $games,
        'count' => count($games),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

function handleClearOldGames() {
    $game_history_file = '/var/www/gamehappy.app/data/game-history.json';
    
    if (!file_exists($game_history_file)) {
        http_response_code(404);
        echo json_encode(['error' => 'Game history file not found']);
        return;
    }

    $history = json_decode(file_get_contents($game_history_file), true);
    $now = time();
    $day_ago = $now - (24 * 3600);
    $removed = 0;

    foreach (['secret_syndicates', 'flag_guardians', 'are_we_there_yet'] as $game_type) {
        if (!isset($history[$game_type])) continue;
        
        $new_games = [];
        foreach ($history[$game_type] as $game) {
            $game_time = strtotime($game['created_at'] ?? 'now');
            if ($game_time > $day_ago) {
                $new_games[] = $game;
            } else {
                $removed++;
            }
        }
        $history[$game_type] = $new_games;
    }

    file_put_contents($game_history_file, json_encode($history, JSON_PRETTY_PRINT));

    echo json_encode([
        'success' => true,
        'removed' => $removed,
        'message' => "Removed $removed old games"
    ]);
}

function handleExport() {
    $contact_dir = '/var/www/gamehappy.app/data/contact-submissions';
    $game_history_file = '/var/www/gamehappy.app/data/game-history.json';

    $export = [
        'export_date' => date('Y-m-d H:i:s'),
        'messages' => [],
        'game_history' => []
    ];

    // Get messages
    if (is_dir($contact_dir)) {
        $files = glob($contact_dir . '/*.json');
        foreach ($files as $file) {
            $content = json_decode(file_get_contents($file), true);
            if ($content) {
                $export['messages'][] = $content;
            }
        }
    }

    // Get game history
    if (file_exists($game_history_file)) {
        $export['game_history'] = json_decode(file_get_contents($game_history_file), true) ?? [];
    }

    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="gamehappy-export-' . date('Y-m-d') . '.json"');
    echo json_encode($export, JSON_PRETTY_PRINT);
}
?>
