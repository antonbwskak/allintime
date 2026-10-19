<?php
header('Content-Type: application/json');

$logFile = __DIR__ . '/form_submissions.log';

function logMsg($msg) {
    global $logFile;
    @file_put_contents($logFile, date('Y-m-d H:i:s') . ' ' . $msg . "\n", FILE_APPEND);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    logMsg('ERROR: Invalid JSON');
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data']);
    exit;
}

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$topic = $data['topic'] ?? '';
$watch = $data['watch'] ?? '';
$phone = $data['phone'] ?? '';
$set = $data['set'] ?? '';
$message = trim($data['message'] ?? '');

if (!$name || !$email || !$message) {
    logMsg('ERROR: Missing fields');
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
$headers = [
    'From' => 'anton@allintime.dk',
    'Reply-To' => $email,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8'
];

$header_str = '';
foreach ($headers as $key => $value) {
    $header_str .= "$key: $value\r\n";
}

logMsg("Sending $topic from $email using PHP mail()");

$sent = @mail($to, $subject, $body, $header_str);

if ($sent) {
    logMsg("SUCCESS: $topic from $email");
    echo json_encode(['success' => true]);
} else {
    logMsg("ERROR: mail() failed");
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email']);
}
