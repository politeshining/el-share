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

$token = bin2hex(random_bytes(32));

$session = [
    "token" => $token,
    "status" => "waiting",
    "created_at" => time(),
    "expires_at" => time() + 300,
    "files" => [],
    "host_key" => bin2hex(random_bytes(32))
];

$filePath = __DIR__ . "/storage/" . $token . ".json";

$saved = file_put_contents(
    $filePath,
    json_encode($session),
    LOCK_EX
);

if ($saved === false) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Could not create pairing session."
    ]);

    exit;
}

echo json_encode([
    "success" => true,
    "token" => $token,
    "expires_at" => $session["expires_at"],
    "device_key" => $session["host_key"]
]);
