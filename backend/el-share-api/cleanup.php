<?php

if (PHP_SAPI !== "cli") {
    http_response_code(403);
    exit("Access denied.");
}

// require_once "config.php";

function deleteDirectory($directory)
{
    if (is_link($directory)) return unlink($directory);
    if (!is_dir($directory)) return true;

    $items = scandir($directory);
    if ($items === false) {
        return false;
    }

    foreach ($items as $item) {
        if ($item === "." || $item === "..") continue;

        $path = $directory . DIRECTORY_SEPARATOR . $item;

        if (is_link($path)) {
            if (!unlink($path)) return false;
        } elseif (is_dir($path)) {
            if (!deleteDirectory($path)) return false;
        } else {
            if (!unlink($path)) return false;
        }
    }

    return rmdir($directory);
}

$storageDirectory = __DIR__ . DIRECTORY_SEPARATOR . "storage";

if (!is_dir($storageDirectory)) {
    exit("Storage directory not found.\n");
}

$sessionFiles = glob($storageDirectory . DIRECTORY_SEPARATOR . "*.json");

if ($sessionFiles === false) {
    exit("Could not read storage directory.\n");
}

$deletedSessions = 0;

foreach ($sessionFiles as $sessionFile) {
    $sessionHandle = fopen($sessionFile, "r+");
    if (!$sessionHandle || !flock($sessionHandle, LOCK_EX)) {
        if ($sessionHandle) {
            fclose($sessionHandle);
        }
        continue;
    }

    rewind($sessionHandle);
    $session = json_decode(stream_get_contents($sessionHandle), true);
    echo "Checking session: " . basename($sessionFile) . PHP_EOL;
    if (!$session || !isset($session["expires_at"]) || $session["expires_at"] > time()) {
        flock($sessionHandle, LOCK_UN);
        fclose($sessionHandle);
        continue;
    }

    $token = basename($sessionFile, ".json");
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        flock($sessionHandle, LOCK_UN);
        fclose($sessionHandle);
        continue;
    }

    $uploadDirectory = $storageDirectory . DIRECTORY_SEPARATOR . $token;

    $session["status"] = "cleaning";

    rewind($sessionHandle);
    ftruncate($sessionHandle, 0);

    $saved = fwrite($sessionHandle, json_encode($session));
    fflush($sessionHandle);
    if ($saved === false) {
        flock($sessionHandle, LOCK_UN);
        fclose($sessionHandle);
        continue;
    }

    flock($sessionHandle, LOCK_UN);
    fclose($sessionHandle);

    if (!deleteDirectory($uploadDirectory)) {
        echo "Could not delete upload directory for session: " . $token . "\n";
        continue;
    }

    if (!unlink($sessionFile)) {
        echo "Could not delete session file: " . $token . "\n";
        continue;
    }

    $deletedSessions++;

    echo "Cleaned up session: " . $token . "\n";
}


$deletedOrphans = 0;

$uploadDirectories = glob($storageDirectory . DIRECTORY_SEPARATOR . "*", GLOB_ONLYDIR);

foreach ($uploadDirectories as $uploadDirectory) {
    $token = basename($uploadDirectory);

    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        continue;
    }

    $matchingSession = $storageDirectory . DIRECTORY_SEPARATOR . $token . ".json";
    if (is_file($matchingSession)) continue;

    $orphanMarker = $uploadDirectory . DIRECTORY_SEPARATOR . ".el-share-orphan-since";
    if (!is_file($orphanMarker)) {
        $detectedAt = file_put_contents($orphanMarker, time());

        if ($detectedAt === false) {
            echo "Could not mark orphan directory: " . $token . "\n";
            continue;
        }

        echo "New orphan detected. Starting 24-hour grace period: " . $token . "\n";
        continue;
    }

    $detectedAt = file_get_contents($orphanMarker);
    if ($detectedAt === false || !ctype_digit(trim($detectedAt))) {
        echo "Could not verify orphan age: " . $token . "\n";
        continue;
    }

    if (time() - (int) trim($detectedAt) < 86400) {
        echo "Preserving orphan within grace period: " . $token . "\n";
        continue;
    }

    if (deleteDirectory($uploadDirectory)) {
        $deletedOrphans++;
        echo "Deleted orphan directory: " . $token . "\n";
    } else {
        echo "Could not delete orphan directory: " . $token . "\n";
    }
}


echo "\nCleanup completed.\n";
echo "Sessions deleted: " . $deletedSessions . "\n";
echo "Orphan directories deleted: " . $deletedOrphans . "\n";
