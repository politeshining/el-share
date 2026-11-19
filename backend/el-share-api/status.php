<?php

require_once "config.php";

$token = $_GET["token"] ?? "";

if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid pairing token."
    ]);

    exit;
}

$filePath = __DIR__ . "/storage/" . $token . ".json";

if (!file_exists($filePath)) {
    http_response_code(404);

    echo json_encode([
        "success" => false,
        "message" => "Session not found."
    ]);

    exit;
}

$session = json_decode(file_get_contents($filePath), true);

if (!$session || $session["expires_at"] < time()) {
    http_response_code(410);

    echo json_encode([
        "success" => false,
        "message" => "Session expired."
    ]);

    exit;
}

echo json_encode([
    "success" => true,
    "status" => $session["status"]
]);
