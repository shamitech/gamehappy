<?php
$db = new mysqli('localhost', 'root', '', 'gamehappy');
if ($db->connect_error) {
    die('Connection error: ' . $db->connect_error);
}

echo "=== Users Table Structure ===\n";
$result = $db->query('DESCRIBE users');
if ($result) {
    while ($row = $result->fetch_assoc()) {
        echo $row['Field'] . ' | ' . $row['Type'] . ' | ' . $row['Key'] . "\n";
    }
} else {
    echo 'Error: ' . $db->error . "\n";
}

echo "\n=== Check for admin field ===\n";
$result = $db->query("SHOW COLUMNS FROM users LIKE '%admin%'");
if ($result && $result->num_rows > 0) {
    echo "Admin field exists\n";
} else {
    echo "No admin field found\n";
}

echo "\n=== Sample Users ===\n";
$result = $db->query('SELECT * FROM users LIMIT 3');
if ($result) {
    echo "Columns: ";
    $fields = $result->fetch_fields();
    foreach ($fields as $field) {
        echo $field->name . " | ";
    }
    echo "\n";
}

$db->close();
?>
