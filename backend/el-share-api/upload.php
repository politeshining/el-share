
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

$token = $_POST["token"] ?? "";
$deviceKey = $_SERVER["HTTP_X_DEVICE_KEY"] ?? "";

if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid pairing token."
    ]);
    exit;
}

if (!isset($_FILES["file"]) || $_FILES["file"]["error"] !== UPLOAD_ERR_OK) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "File upload failed."
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
    flock($sessionHandle, LOCK_UN);
    fclose($sessionHandle);

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
    flock($sessionHandle, LOCK_UN);
    fclose($sessionHandle);

    http_response_code(403);

    echo json_encode([
        "success" => false,
        "message" => "Invalid device key."
    ]);
    exit;
}

$uploadDirectory = __DIR__ . "/storage/" . $token;

if (!is_dir($uploadDirectory)) {
    mkdir($uploadDirectory, 0755, true);
}

$originalName = basename($_FILES["file"]["name"]);
$storedName = bin2hex(random_bytes(16));
$extension = pathinfo($originalName, PATHINFO_EXTENSION);

if ($extension !== "") {
    $storedName .= "." . $extension;
}

$destination = $uploadDirectory . "/" . $storedName;

if (!move_uploaded_file($_FILES["file"]["tmp_name"], $destination)) {
    flock($sessionHandle, LOCK_UN);
    fclose($sessionHandle);

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Could not save uploaded file."
    ]);
    exit;
}

$file = [
    "id" => bin2hex(random_bytes(16)),
    "name" => $originalName,
    "stored_name" => $storedName,
    "size" => $_FILES["file"]["size"],
    "uploaded_by" => $device,
    "uploaded_at" => time()
];

$session["files"][] = $file;

$session["last_activity"] = time();
$session["expires_at"] = $session["last_activity"] + 3600;

rewind($sessionHandle);
ftruncate($sessionHandle, 0);

$saved = fwrite($sessionHandle, json_encode($session));
fflush($sessionHandle);

flock($sessionHandle, LOCK_UN);
fclose($sessionHandle);

if ($saved === false) {
    unlink($destination);

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Could not update file registry."
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "message" => "File uploaded successfully.",
    "file" => $file
]);
