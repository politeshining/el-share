<?php

require_once "config.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Method not allowed."
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$token = $data["token"] ?? "";

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
        "message" => "Pairing session not found."
    ]);
    exit;
}

$sessionHandle = fopen($filePath, "r+");

if (!$sessionHandle || !flock($sessionHandle, LOCK_EX)) {
    if ($sessionHandle) fclose($sessionHandle);

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Could not access pairing session."
    ]);
    exit;
}

rewind($sessionHandle);
$session = json_decode(stream_get_contents($sessionHandle), true);

if (!$session || $session["expires_at"] < time()) {
    flock($sessionHandle, LOCK_UN);
    fclose($sessionHandle);
    http_response_code(410);

    echo json_encode([
        "success" => false,
        "message" => "Pairing session has expired."
    ]);
    exit;
}

if ($session["status"] === "joined") {
    flock($sessionHandle, LOCK_UN);
    fclose($sessionHandle);

    echo json_encode([
        "success" => true,
        "message" => "Device already joined this pairing session.",
        "device_key" => $session["guest_key"] ?? null
    ]);
    exit;
}

$session["status"] = "joined";
$session["joined_at"] = time();
$session["last_activity"] = time();
$session["expires_at"] = time() + 3600;
$session["guest_key"] = bin2hex(random_bytes(32));

rewind($sessionHandle);
ftruncate($sessionHandle, 0);

$saved = fwrite($sessionHandle, json_encode($session));
fflush($sessionHandle);

flock($sessionHandle, LOCK_UN);
fclose($sessionHandle);

if ($saved === false) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Could not save pairing session."
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "message" => "Successfully joined the pairing session.",
    "device_key" => $session["guest_key"]
]);
