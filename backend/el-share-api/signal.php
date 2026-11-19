<?php

require_once "config.php";

$method = $_SERVER["REQUEST_METHOD"];

if (!in_array($method, ["GET", "POST"], true)) {
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Method not allowed."
    ]);

    exit;
}

$data = $method === "POST"
    ? json_decode(file_get_contents("php://input"), true)
    : $_GET;

$token = $data["token"] ?? "";
$action = $data["action"] ?? "";

if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid pairing token."
    ]);

    exit;
}

$allowedActions = [
    "save_offer",
    "get_offer",
    "save_answer",
    "get_answer"
];

if (!in_array($action, $allowedActions, true)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid signaling action."
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

$session = json_decode(file_get_contents($filePath), true);

if (!$session || $session["expires_at"] < time()) {
    http_response_code(410);

    echo json_encode([
        "success" => false,
        "message" => "Pairing session has expired."
    ]);

    exit;
}

if ($session["status"] !== "joined") {
    http_response_code(409);

    echo json_encode([
        "success" => false,
        "message" => "Waiting for the second device to join."
    ]);

    exit;
}

if ($method === "POST") {
    $description = $data["description"] ?? "";

    if (!is_string($description) || $description === "") {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Missing connection description."
        ]);

        exit;
    }

    $session[$action === "save_offer" ? "offer" : "answer"] = $description;

    $saved = file_put_contents(
        $filePath,
        json_encode($session),
        LOCK_EX
    );

    if ($saved === false) {
        http_response_code(500);

        echo json_encode([
            "success" => false,
            "message" => "Could not save connection description."
        ]);

        exit;
    }

    echo json_encode([
        "success" => true,
        "message" => "Connection description saved."
    ]);

    exit;
}

$key = $action === "get_offer" ? "offer" : "answer";

echo json_encode([
    "success" => true,
    "description" => $session[$key] ?? null
]);
