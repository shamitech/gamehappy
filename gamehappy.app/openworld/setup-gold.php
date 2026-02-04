<?php
/**
 * Setup script to create gold economy tables in the database
 * Access at: /openworld/setup-gold.php
 */

echo "Gold Economy System Setup\n";
echo "========================\n\n";

// Database connection
try {
    $pdo = new PDO(
        'mysql:host=localhost;dbname=gamehappy',
        'gamehappy',
        'GameHappy2026',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "✓ Database connected\n\n";
} catch (PDOException $e) {
    die("✗ Database connection failed: " . $e->getMessage());
}

$tables = [
    'ow_players' => 'CREATE TABLE IF NOT EXISTS ow_players (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        gold INT DEFAULT 1000,
        current_place_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (current_place_id) REFERENCES ow_places(id) ON DELETE SET NULL,
        INDEX (username)
    )',
    'ow_ownership' => 'CREATE TABLE IF NOT EXISTS ow_ownership (
        id INT PRIMARY KEY AUTO_INCREMENT,
        object_id INT NOT NULL,
        player_id INT NOT NULL,
        original_place_id INT,
        acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (object_id) REFERENCES ow_objects(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES ow_players(id) ON DELETE CASCADE,
        INDEX (player_id),
        INDEX (object_id)
    )',
    'ow_transactions' => 'CREATE TABLE IF NOT EXISTS ow_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount INT NOT NULL,
        balance_after INT NOT NULL,
        object_id INT,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES ow_players(id) ON DELETE CASCADE,
        FOREIGN KEY (object_id) REFERENCES ow_objects(id) ON DELETE SET NULL,
        INDEX (player_id),
        INDEX (created_at)
    )',
    'ow_inventory' => 'CREATE TABLE IF NOT EXISTS ow_inventory (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL,
        object_id INT NOT NULL,
        quantity INT DEFAULT 1,
        acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES ow_players(id) ON DELETE CASCADE,
        FOREIGN KEY (object_id) REFERENCES ow_objects(id) ON DELETE CASCADE,
        UNIQUE KEY unique_player_object (player_id, object_id),
        INDEX (player_id)
    )'
];

foreach ($tables as $name => $sql) {
    try {
        $pdo->exec($sql);
        echo "✓ Table '$name' ready\n";
    } catch (PDOException $e) {
        echo "✗ Table '$name' failed: " . $e->getMessage() . "\n";
    }
}

echo "\n✓ Gold economy system setup complete!\n";
echo "Players can now register and play at: /openworld/play.html\n";
?>
