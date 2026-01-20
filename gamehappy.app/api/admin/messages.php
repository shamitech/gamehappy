<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

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
    'count' => count($messages)
]);
?>
