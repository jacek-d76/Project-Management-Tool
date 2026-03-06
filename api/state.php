<?php
header('Content-Type: application/json; charset=utf-8');

// ─── Config ───────────────────────────────────────────────────────────────────
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'config.php not found']);
    exit;
}
require_once $configFile;

// ─── Auth ─────────────────────────────────────────────────────────────────────
$key = $_SERVER['HTTP_X_API_KEY'] ?? '';
if (!hash_equals(API_KEY, $key)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// ─── DB connection ────────────────────────────────────────────────────────────
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed']);
    exit;
}

// ─── GET – zwróć stan ─────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $row = $pdo->query('SELECT data FROM app_state WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
    echo $row ? $row['data'] : '{}';
    exit;
}

// ─── POST – zapisz stan ───────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = file_get_contents('php://input');

    // Walidacja JSON
    json_decode($body);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO app_state (id, data) VALUES (1, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()'
    );
    $stmt->execute([$body]);

    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
