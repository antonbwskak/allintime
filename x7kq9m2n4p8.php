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
$images = $data['images'] ?? [];

if (!$name || !$email || !$message) {
    logMsg('ERROR: Missing fields');
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$isSell = ($topic === 'Sell or trade');
$subject = "Ny besked fra allintime.dk";

$body = "Navn: $name\n";
$body .= "Email: $email\n";
$body .= "Emne: $topic\n";
$body .= "Ur: " . ($watch ?: '-') . "\n";

if ($isSell) {
    $body .= "Telefon: " . ($phone ?: '-') . "\n";
    $body .= "Tilbehør: " . ($set ?: '-') . "\n";
}

$body .= "\nBesked:\n$message\n";

$smtpHost = 'smtp.simply.com';
$smtpPort = 587;
$smtpUser = 'anton@allintime.dk';
$smtpPass = '290607Abw';
$from = 'anton@allintime.dk';
$to = 'anton@allintime.dk';
$CRLF = "\r\n";

logMsg("Sending $topic from $email");

// Use TLS from the start (implicit TLS on port 587)
$socket = @fsockopen('tls://' . $smtpHost, $smtpPort, $errno, $errstr, 10);
if (!$socket) {
    logMsg("ERROR: Connection failed - $errstr ($errno)");
    http_response_code(500);
    echo json_encode(['error' => 'Connection failed']);
    exit;
}
stream_set_timeout($socket, 10);

$line = fgets($socket, 512);
if (substr($line, 0, 3) !== '220') {
    fclose($socket);
    logMsg("ERROR: Bad greeting: $line");
    http_response_code(500);
    echo json_encode(['error' => 'SMTP error']);
    exit;
}

fputs($socket, "EHLO localhost$CRLF");
$line = fgets($socket, 512);
while (substr($line, 3, 1) === '-') {
    $line = fgets($socket, 512);
}

fputs($socket, "AUTH LOGIN$CRLF");
$line = fgets($socket, 512);

fputs($socket, base64_encode($smtpUser) . $CRLF);
$line = fgets($socket, 512);

fputs($socket, base64_encode($smtpPass) . $CRLF);
$line = fgets($socket, 512);
if (substr($line, 0, 3) !== '235') {
    fclose($socket);
    logMsg("ERROR: Auth failed: $line");
    http_response_code(500);
    echo json_encode(['error' => 'Auth failed']);
    exit;
}

fputs($socket, "MAIL FROM: <$from>$CRLF");
$line = fgets($socket, 512);

fputs($socket, "RCPT TO: <$to>$CRLF");
$line = fgets($socket, 512);

fputs($socket, "DATA$CRLF");
$line = fgets($socket, 512);

$boundary = md5(time());
$headers = "From: $from$CRLF";
$headers .= "Reply-To: $email$CRLF";
$headers .= "Subject: $subject$CRLF";
$headers .= "MIME-Version: 1.0$CRLF";

if ($isSell && !empty($images)) {
    $headers .= "Content-Type: multipart/mixed; boundary=$boundary$CRLF";
    $msgBody = "--$boundary$CRLF";
    $msgBody .= "Content-Type: text/plain; charset=UTF-8$CRLF$CRLF";
    $msgBody .= $body . $CRLF;

    foreach ($images as $i => $img) {
        if (preg_match('/^data:image\/(\w+);base64,/', $img, $matches)) {
            $ext = $matches[1];
            $imgData = base64_decode(str_replace($matches[0], '', $img));
            $filename = "ur_billede_" . ($i + 1) . ".$ext";

            $msgBody .= "$CRLF--$boundary$CRLF";
            $msgBody .= "Content-Type: image/$ext; name=\"$filename\"$CRLF";
            $msgBody .= "Content-Transfer-Encoding: base64$CRLF";
            $msgBody .= "Content-Disposition: attachment; filename=\"$filename\"$CRLF$CRLF";
            $msgBody .= chunk_split(base64_encode($imgData));
        }
    }
    $msgBody .= "$CRLF--$boundary--$CRLF";
} else {
    $headers .= "Content-Type: text/plain; charset=UTF-8$CRLF";
    $msgBody = $body . $CRLF;
}

fputs($socket, $headers . $CRLF . $CRLF . $msgBody . "." . $CRLF);
$line = fgets($socket, 512);

if (substr($line, 0, 3) !== '250') {
    fclose($socket);
    logMsg("ERROR: Send failed: $line");
    http_response_code(500);
    echo json_encode(['error' => 'Send failed']);
    exit;
}

fputs($socket, "QUIT$CRLF");
fclose($socket);

logMsg("SUCCESS: $topic from $email");
echo json_encode(['success' => true]);
