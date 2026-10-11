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

$sent = mail($to, $subject, $body, $header_str);

if ($sent) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email']);
}
