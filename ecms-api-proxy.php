<?php
declare(strict_types=1);

/**
 * Same-origin reverse proxy: Hostinger SPA -> backend API (VPS or Railway).
 * Avoids browser CORS when the UI and API run on different hosts.
 */
$upstreamFile = __DIR__ . '/ecms-api-upstream.php';
$upstream = '';
if (is_file($upstreamFile)) {
    $configured = include $upstreamFile;
    if (is_string($configured) && $configured !== '') {
        $upstream = rtrim($configured, '/');
    }
}
if ($upstream === '') {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['message' => 'API upstream not configured. Create ecms-api-upstream.php on the server.']);
    exit;
}

$path = $_GET['ecms_path'] ?? '';
$path = ltrim($path, '/');
// Frontend encodes slashes as ':' (Hostinger may strip %2F in query strings).
$path = str_replace(':', '/', $path);
if ($path === '' || !preg_match('#^(api|uploads)(/|$)#', $path)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['message' => 'Invalid proxy path']);
    exit;
}

$params = $_GET;
unset($params['ecms_path']);
$qs = http_build_query($params);
$target = rtrim($upstream, '/') . '/' . $path . ($qs !== '' ? '?' . $qs : '');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$skipHeaders = ['host', 'connection', 'content-length', 'accept-encoding'];
$forwardHeaders = [];
foreach (getallheaders() as $name => $value) {
    if (in_array(strtolower($name), $skipHeaders, true)) {
        continue;
    }
    $forwardHeaders[] = $name . ': ' . $value;
}

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if ($auth !== '' && !str_contains(implode("\n", $forwardHeaders), 'Authorization:')) {
    $forwardHeaders[] = 'Authorization: ' . $auth;
}

/**
 * PHP does not expose multipart bodies on php://input — rebuild for cURL.
 *
 * @return array<string, string|CURLFile>|null null when not multipart
 */
function ecms_proxy_multipart_fields(): ?array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'multipart/form-data') === false) {
        return null;
    }

    $fields = [];
    foreach ($_POST as $key => $value) {
        if (is_scalar($value)) {
            $fields[(string) $key] = (string) $value;
        }
    }

    foreach ($_FILES as $key => $file) {
        if (!is_array($file) || !isset($file['tmp_name'])) {
            continue;
        }
        if (is_array($file['tmp_name'])) {
            continue;
        }
        $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        if ($error !== UPLOAD_ERR_OK) {
            continue;
        }
        $tmp = $file['tmp_name'];
        if (!is_string($tmp) || $tmp === '' || !is_uploaded_file($tmp)) {
            continue;
        }
        $mime = is_string($file['type'] ?? null) && $file['type'] !== '' ? $file['type'] : 'application/octet-stream';
        $name = is_string($file['name'] ?? null) && $file['name'] !== '' ? $file['name'] : 'upload';
        $fields[(string) $key] = new CURLFile($tmp, $mime, $name);
    }

    return $fields;
}

$multipartFields = ecms_proxy_multipart_fields();
$body = null;
if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
    if ($multipartFields !== null) {
        if ($multipartFields === []) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'File upload could not be read by the proxy (missing file or exceeds Hostinger upload limit).',
            ]);
            exit;
        }
        $forwardHeaders = array_values(array_filter(
            $forwardHeaders,
            static fn (string $h): bool => stripos($h, 'Content-Type:') !== 0,
        ));
    } else {
        $body = file_get_contents('php://input');
    }
}

$ch = curl_init($target);
$curlOptions = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_HTTPHEADER => $forwardHeaders,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => 120,
];
if ($multipartFields !== null) {
    $curlOptions[CURLOPT_POST] = true;
    $curlOptions[CURLOPT_POSTFIELDS] = $multipartFields;
} else {
    $curlOptions[CURLOPT_CUSTOMREQUEST] = $method;
    if ($body !== null) {
        $curlOptions[CURLOPT_POSTFIELDS] = $body;
    }
}
curl_setopt_array($ch, $curlOptions);

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['message' => 'Upstream API unreachable']);
    exit;
}

$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$bodyOut = substr($response, $headerSize);

http_response_code($status);

$hopHeaders = ['transfer-encoding', 'connection', 'content-encoding', 'keep-alive'];
foreach (explode("\r\n", $rawHeaders) as $line) {
    if ($line === '' || stripos($line, 'HTTP/') === 0) {
        continue;
    }
    $colon = strpos($line, ':');
    if ($colon === false) {
        continue;
    }
    $headerName = strtolower(trim(substr($line, 0, $colon)));
    if (in_array($headerName, $hopHeaders, true)) {
        continue;
    }
    header(trim($line), false);
}

echo $bodyOut;
