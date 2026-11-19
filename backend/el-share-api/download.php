<?php

require_once "config.php";
if (ob_get_length()) {
    ob_clean();
}
$token = $_GET["token"] ?? "";
$fileId = $_GET["file_id"] ?? "";
$deviceKey = $_SERVER["HTTP_X_DEVICE_KEY"] ?? "";

if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid pairing token."
    ]);
    exit;
}

if (!preg_match('/^[a-f0-9]{32}$/', $fileId)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid file ID."
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

$file = null;

foreach ($session["files"] ?? [] as $sessionFile) {
    if (($sessionFile["id"] ?? "") === $fileId) {
        $file = $sessionFile;
        break;
    }
}

if (!$file) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "File not found."
    ]);
    exit;
}

if (($file["uploaded_by"] ?? "") === $device) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "You cannot download your own uploaded file."
    ]);
    exit;
}

$storedName = $file["stored_name"] ?? "";

if (!preg_match('/^[a-f0-9]{32}(?:\.[a-zA-Z0-9]+)?$/', $storedName)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid stored filename."
    ]);
    exit;
}

$filePath = __DIR__ . "/storage/" . $token . "/" . $storedName;

if (!is_file($filePath)) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Stored file not found."
    ]);
    exit;
}

$originalName = basename($file["name"] ?? "download");
$mimeType = mime_content_type($filePath) ?: "application/octet-stream";

header("Content-Type: " . $mimeType);
header("Content-Length: " . filesize($filePath));
header(
    "Content-Disposition: attachment; filename*=UTF-8''" .
        rawurlencode($originalName)
);
header("Cache-Control: no-store");

error_log("Download file size: " . filesize($filePath));
readfile($filePath);

$session["last_activity"] = time();
$session["expires_at"] = $session["last_activity"] + 3600;

rewind($sessionHandle);
ftruncate($sessionHandle, 0);

$saved = fwrite($sessionHandle, json_encode($session));
fflush($sessionHandle);

if ($saved === false) {
    error_log("Could not update session activity after download: " . $token);
}

flock($sessionHandle, LOCK_UN);
fclose($sessionHandle);

exit;
