<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
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
$images = $data['images'] ?? []; // base64 encoded images

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

if (!empty($images) && $isSell) {
    $body .= "\n\nBilleder:\n";
    foreach ($images as $i => $img) {
        $body .= "Bild $i: se vedhæftning\n";
    }
}

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

// Handle attachments for sell form with images
if (!empty($images) && $isSell) {
    $boundary = md5(time());
    $headers['Content-Type'] = "multipart/mixed; boundary=$boundary";
    $header_str = '';
    foreach ($headers as $key => $value) {
        $header_str .= "$key: $value\r\n";
    }

    $body_parts = [];
    $body_parts[] = "--$boundary";
    $body_parts[] = "Content-Type: text/plain; charset=UTF-8";
    $body_parts[] = "";
    $body_parts[] = $body;

    foreach ($images as $i => $img) {
        if (preg_match('/^data:image\/(\w+);base64,/', $img, $matches)) {
            $ext = $matches[1];
            $img_data = base64_decode(str_replace($matches[0], '', $img));
            $filename = "ur_billede_" . ($i + 1) . "." . $ext;
            $body_parts[] = "--$boundary";
            $body_parts[] = "Content-Type: image/$ext";
            $body_parts[] = "Content-Transfer-Encoding: base64";
            $body_parts[] = "Content-Disposition: attachment; filename=\"$filename\"";
            $body_parts[] = "";
            $body_parts[] = base64_encode($img_data);
        }
    }
    $body_parts[] = "--$boundary--";
    $body = implode("\r\n", $body_parts);
}

$sent = @mail($to, $subject, $body, $header_str);
$mailError = error_get_last();

if ($sent) {
    logSubmission($data, 'SUCCESS');
    echo json_encode(['success' => true]);
} else {
    $errorMsg = $mailError ? $mailError['message'] : 'Unknown error';
    logSubmission($data, 'MAIL_FAILED: ' . $errorMsg);
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email: ' . $errorMsg]);
}
