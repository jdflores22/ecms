<?php
declare(strict_types=1);
/**
 * Serves logicteck-test.html with no-store headers (Hostinger CDN often caches .html).
 */
$path = __DIR__ . '/logicteck-test.html';
if (!is_file($path)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'logicteck-test.html not found on server.';
    exit;
}
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
readfile($path);
exit;
