<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$topic = $data['topic'] ?? '';
$watch = $data['watch'] ?? '';
$phone = $data['phone'] ?? '';
$set = $data['set'] ?? '';
$message = trim($data['message'] ?? '');

if (!$name || !$email || !$message) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$isSell = ($topic === 'Sell or trade');
$subject = $isSell
    ? "Ur til salg fra allintime.dk"
    : "Forespørgsel fra allintime.dk";

$body = "Navn: $name\n";
$body .= "Email: $email\n";
$body .= "Emne: $topic\n";
$body .= "Ur: " . ($watch ?: '-') . "\n";

if ($isSell) {
    $body .= "Telefon: " . ($phone ?: '-') . "\n";
    $body .= "Tilbehør: " . ($set ?: '-') . "\n";
}

$body .= "\nBesked:\n$message\n";

$to = 'anton@allintime.dk';
$from = 'anton@allintime.dk';

$headers = [
    'From' => $from,
    'Reply-To' => $email,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8'
];

// SMTP settings for Simply.com
$smtp_host = 'websmtp.simply.com';
$smtp_port = 587;
$smtp_user = 'anton@allintime.dk';
$smtp_pass = '290607Abw';

// Use fsockopen to send via SMTP
$crlf = "\r\n";

$fp = @fsockopen($smtp_host, $smtp_port, $errno, $errstr, 30);
if (!$fp) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not connect to SMTP server']);
    exit;
}

stream_set_timeout($fp, 30);

// Read greeting
$resp = fgets($fp, 512);
if (substr($resp, 0, 3) !== '220') {
    fclose($fp);
    http_response_code(500);
    echo json_encode(['error' => 'SMTP greeting failed']);
    exit;
}

// Send EHLO
fputs($fp, "EHLO " . gethostname() . $crlf);
$resp = fgets($fp, 512);

// Send STARTTLS
fputs($fp, "STARTTLS" . $crlf);
$resp = fgets($fp, 512);

if (substr($resp, 0, 3) === '220') {
    // Upgrade to TLS
    stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);

    // Re-EHLO after TLS
    fputs($fp, "EHLO " . gethostname() . $crlf);
    $resp = fgets($fp, 512);
}

// Authenticate
fputs($fp, "AUTH LOGIN" . $crlf);
$resp = fgets($fp, 512);

fputs($fp, base64_encode($smtp_user) . $crlf);
$resp = fgets($fp, 512);

fputs($fp, base64_encode($smtp_pass) . $crlf);
$resp = fgets($fp, 512);

if (substr($resp, 0, 3) !== '235') {
    fclose($fp);
    http_response_code(500);
    echo json_encode(['error' => 'SMTP authentication failed']);
    exit;
}

// Send MAIL FROM
fputs($fp, "MAIL FROM: <$from>" . $crlf);
$resp = fgets($fp, 512);

// Send RCPT TO
fputs($fp, "RCPT TO: <$to>" . $crlf);
$resp = fgets($fp, 512);

// Send DATA
fputs($fp, "DATA" . $crlf);
$resp = fgets($fp, 512);

// Send email headers and body
$headers_str = '';
foreach ($headers as $key => $value) {
    $headers_str .= "$key: $value$crlf";
}

fputs($fp, $headers_str . $crlf);
fputs($fp, "Subject: $subject$crlf");
fputs($fp, $crlf);
fputs($fp, $body . $crlf);
fputs($fp, "." . $crlf);
$resp = fgets($fp, 512);

// Quit
fputs($fp, "QUIT" . $crlf);
fclose($fp);

echo json_encode(['success' => true]);
