<?php
require_once 'api/auth/Database.php';
$db = new GameHappyDB();
$db->createTables();
echo "✅ Tables recreated successfully";
?>
