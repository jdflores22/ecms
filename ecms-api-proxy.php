<?php
declare(strict_types=1);

/**
 * Same-origin reverse proxy: Hostinger SPA -> Railway API.
 * Avoids browser CORS when the UI and API run on different hosts.
 */
$upstream = 'https://ecms-production-42be.up.railway.app';

$path = $_GET['ecms_path'] ?? '';
$path = ltrim($path, '/');
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

$body = null;
if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
    $body = file_get_contents('php://input');
}

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_HTTPHEADER => $forwardHeaders,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => 120,
]);
if ($body !== null) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

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
