
<?php

require_once "config.php";

$token = $_GET["token"] ?? "";
$deviceKey = $_SERVER["HTTP_X_DEVICE_KEY"] ?? "";

if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid pairing token."
    ]);
    exit;
}

$sessionPath = __DIR__ . "/storage/" . $token . ".json";

if (!file_exists($sessionPath)) {
    http_response_code(404);

    echo json_encode([
        "success" => false,
        "message" => "Pairing session not found."
    ]);
    exit;
}

$sessionHandle = fopen($sessionPath, "r+");

if (!$sessionHandle || !flock($sessionHandle, LOCK_EX)) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Could not access pairing session."
    ]);
    exit;
}

rewind($sessionHandle);
$session = json_decode(stream_get_contents($sessionHandle), true);

if (!$session || $session["expires_at"] < time() || $session["status"] !== "joined") {
    http_response_code(410);

    echo json_encode([
        "success" => false,
        "message" => "Pairing session is invalid or expired."
    ]);
    exit;
}
if (hash_equals($session["host_key"], $deviceKey)) {
    $device = "host";
} elseif (hash_equals($session["guest_key"], $deviceKey)) {
    $device = "guest";
} else {
    http_response_code(403);

    echo json_encode([
        "success" => false,
        "message" => "Invalid device key."
    ]);
    exit;
}

$session["last_activity"] = time();
$session["expires_at"] = $session["last_activity"] + 3600;

rewind($sessionHandle);
ftruncate($sessionHandle, 0);

$saved = fwrite($sessionHandle, json_encode($session));
fflush($sessionHandle);

if ($saved === false) {
    flock($sessionHandle, LOCK_UN);
    fclose($sessionHandle);

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Could not update session activity."
    ]);

    exit;
}

flock($sessionHandle, LOCK_UN);
fclose($sessionHandle);

$files = $session["files"] ?? [];

$availableFiles = array_values(array_filter(
    $files,
    function ($file) use ($device) {
        return ($file["uploaded_by"] ?? "") !== $device;
    }
));

echo json_encode([
    "success" => true,
    "files" => $availableFiles
]);
