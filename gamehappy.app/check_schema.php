<?php
$db_host = 'localhost';
$db_user = 'gamehappy';
$db_pass = 'GameHappy2026';
$db_name = 'gamehappy';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get table structure
    $stmt = $pdo->query("DESCRIBE ow_worlds");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h2>ow_worlds Table Structure</h2>";
    echo "<table border='1' cellpadding='10'>";
    echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
    
    foreach ($columns as $col) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($col['Field']) . "</td>";
        echo "<td>" . htmlspecialchars($col['Type']) . "</td>";
        echo "<td>" . htmlspecialchars($col['Null']) . "</td>";
        echo "<td>" . htmlspecialchars($col['Key']) . "</td>";
        echo "<td>" . htmlspecialchars($col['Default'] ?? 'NULL') . "</td>";
        echo "<td>" . htmlspecialchars($col['Extra']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Also show current worlds
    echo "<h2>Current Worlds</h2>";
    $stmt = $pdo->query("SELECT * FROM ow_worlds");
    $worlds = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($worlds)) {
        echo "<p>No worlds yet</p>";
    } else {
        echo "<pre>" . json_encode($worlds, JSON_PRETTY_PRINT) . "</pre>";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
