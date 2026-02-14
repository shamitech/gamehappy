<?php
// Websocket Server Control API

header('Content-Type: application/json');
session_start();

// Check authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? null;
$websocket_dir = realpath(__DIR__ . '/../../websocket');
$log_file = $websocket_dir . '/websocket-server.log';
$pid_file = $websocket_dir . '/.websocket.pid';

// Functions to manage websocket
function getWebsocketStatus() {
    global $pid_file, $websocket_dir;
    
    // Check if PID file exists and process is running
    if (file_exists($pid_file)) {
        $pid = intval(file_get_contents($pid_file));
        // On Windows, check if process exists
        if (PHP_OS_FAMILY === 'Windows') {
            $output = shell_exec("tasklist /FI \"PID eq $pid\" 2>&1");
            if (strpos($output, $pid) !== false) {
                return ['running' => true, 'pid' => $pid];
            }
        } else {
            $output = shell_exec("ps -p $pid 2>&1");
            if (strpos($output, (string)$pid) !== false) {
                return ['running' => true, 'pid' => $pid];
            }
        }
        @unlink($pid_file);
    }
    return ['running' => false, 'pid' => null];
}

function startWebsocket() {
    global $websocket_dir, $pid_file, $log_file;
    
    // Check if already running
    $status = getWebsocketStatus();
    if ($status['running']) {
        return ['success' => false, 'message' => 'Websocket server is already running (PID: ' . $status['pid'] . ')'];
    }
    
    // Check if node modules exist
    if (!is_dir($websocket_dir . '/node_modules')) {
        return ['success' => false, 'message' => 'Node modules not installed. Run "npm install" in websocket directory.'];
    }
    
    // Change to websocket directory and start server
    $cmd = '';
    if (PHP_OS_FAMILY === 'Windows') {
        // Start in background on Windows using START command
        $cmd = "cd /d $websocket_dir && START /B node server.js >> $log_file 2>&1";
        $handle = popen($cmd, 'r');
        pclose($handle);
        
        // Give server a moment to start, then find its PID
        sleep(2);
        $output = shell_exec("netstat -ano | findstr :8443");
        if ($output) {
            preg_match('/\s(\d+)\s*$/', $output, $matches);
            if (isset($matches[1])) {
                file_put_contents($pid_file, $matches[1]);
                return ['success' => true, 'message' => 'Websocket server started (PID: ' . $matches[1] . ')'];
            }
        }
    } else {
        // Start in background on Unix/Linux
        $cmd = "cd $websocket_dir && nohup node server.js >> $log_file 2>&1 & echo $!";
        $pid = intval(shell_exec($cmd));
        if ($pid > 0) {
            file_put_contents($pid_file, $pid);
            return ['success' => true, 'message' => 'Websocket server started (PID: ' . $pid . ')'];
        }
    }
    
    return ['success' => false, 'message' => 'Failed to start websocket server. Check logs.'];
}

function stopWebsocket() {
    global $pid_file, $websocket_dir;
    
    $status = getWebsocketStatus();
    if (!$status['running']) {
        return ['success' => false, 'message' => 'Websocket server is not running'];
    }
    
    $pid = $status['pid'];
    $cmd = '';
    
    if (PHP_OS_FAMILY === 'Windows') {
        $cmd = "taskkill /PID $pid /F 2>&1";
    } else {
        $cmd = "kill -9 $pid 2>&1";
    }
    
    $output = shell_exec($cmd);
    @unlink($pid_file);
    
    return ['success' => true, 'message' => 'Websocket server stopped'];
}

function getWebsocketLogs($lines = 50) {
    global $log_file;
    
    if (!file_exists($log_file)) {
        return [];
    }
    
    $file_lines = file($log_file, FILE_IGNORE_NEW_LINES);
    if (!$file_lines) {
        return [];
    }
    
    // Return last N lines
    return array_slice($file_lines, -$lines);
}

function restartWebsocket() {
    $stop = stopWebsocket();
    sleep(1);
    $start = startWebsocket();
    
    return ['success' => $start['success'], 'message' => 'Websocket restarted. ' . $start['message']];
}

// Handle actions
switch ($action) {
    case 'status':
        $status = getWebsocketStatus();
        echo json_encode(['success' => true, 'running' => $status['running'], 'pid' => $status['pid']]);
        break;
        
    case 'start':
        $result = startWebsocket();
        http_response_code($result['success'] ? 200 : 400);
        echo json_encode($result);
        break;
        
    case 'stop':
        $result = stopWebsocket();
        http_response_code($result['success'] ? 200 : 400);
        echo json_encode($result);
        break;
        
    case 'restart':
        $result = restartWebsocket();
        http_response_code($result['success'] ? 200 : 400);
        echo json_encode($result);
        break;
        
    case 'logs':
        $lines = intval($_GET['lines'] ?? 50);
        $logs = getWebsocketLogs($lines);
        echo json_encode(['success' => true, 'logs' => $logs]);
        break;
        
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>
