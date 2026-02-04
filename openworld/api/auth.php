<?php
/**
 * Open World Game - Authentication API
 */

header('Content-Type: application/json');

// Ensure session is started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Get action from GET, POST form data, or JSON body
$action = $_GET['action'] ?? $_POST['action'] ?? null;

// If no action in GET/POST, check JSON body
if (!$action) {
    $json_data = json_decode(file_get_contents('php://input'), true);
    $action = $json_data['action'] ?? null;
}

if (!$action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action parameter required']);
    exit;
}

switch ($action) {
    case 'login':
        login();
        break;
    case 'logout':
        logout();
        break;
    case 'check':
    case 'checkAuth':
        checkAuth();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
}

function login() {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? null;
    $password = $data['password'] ?? null;
    
    if ($username === 'admin' && $password === 'admin123') {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_username'] = 'admin';
        echo json_encode(['success' => true, 'message' => 'Logged in successfully']);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    }
}

function logout() {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out']);
}

function checkAuth() {
    if ($_SESSION['admin_logged_in'] ?? false) {
        echo json_encode(['success' => true, 'authenticated' => true, 'username' => $_SESSION['admin_username'] ?? 'admin']);
    } else {
        echo json_encode(['success' => false, 'authenticated' => false, 'message' => 'Not authenticated']);
    }
}
?>
