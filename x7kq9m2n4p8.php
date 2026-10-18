<?php
header('Content-Type: application/json');

$logFile = __DIR__ . '/form_submissions.log';

function logSubmission($data, $result) {
    global $logFile;
    $entry = date('Y-m-d H:i:s') . ' | ' . ($data['topic'] ?? 'unknown') . ' | ' . ($data['email'] ?? 'no email') . ' | ' . ($data['name'] ?? 'no name') . ' | ' . $result . "\n";
    @file_put_contents($logFile, $entry, FILE_APPEND);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data']);
    logSubmission($_POST, 'INVALID_DATA');
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
$from = 'anton@allintime.dk';
$smtpHost = 'smtp.simply.com';
$smtpPort = 587;
$smtpUser = 'anton@allintime.dk';
$smtpPass = '290607Abw';

function smtpMail($to, $subject, $body, $from, $smtpHost, $smtpPort, $smtpUser, $smtpPass, $isSell, $images) {
    $timeout = 10;
    $localhost = 'localhost';
    $newLine = "\r\n";

    $socket = @fsockopen($smtpHost, $smtpPort, $errno, $errstr, $timeout);
    if (!$socket) {
        return "Connection failed: $errstr ($errno)";
    }
    stream_set_timeout($socket, $timeout);

    $response = fgets($socket, 515);
    if (substr($response, 0, 3) !== '220') {
        fclose($socket);
        return "Bad greeting: $response";
    }

    fputs($socket, "EHLO $localhost$newLine");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) !== '250') {
        fputs($socket, "HELO $localhost$newLine");
        $response = fgets($socket, 515);
    }

    fputs($socket, "AUTH LOGIN$newLine");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) !== '334') {
        fclose($socket);
        return "Auth init failed: $response";
    }

    fputs($socket, base64_encode($smtpUser) . $newLine);
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) !== '334') {
        fclose($socket);
        return "Username failed: $response";
    }

    fputs($socket, base64_encode($smtpPass) . $newLine);
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) !== '235') {
        fclose($socket);
        return "Password failed: $response";
    }

    fputs($socket, "MAIL FROM: <$from>$newLine");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) !== '250') {
        fclose($socket);
        return "Mail from failed: $response";
    }

    fputs($socket, "RCPT TO: <$to>$newLine");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) !== '250') {
        fclose($socket);
        return "Rcpt to failed: $response";
    }

    fputs($socket, "DATA$newLine");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) !== '354') {
        fclose($socket);
        return "Data failed: $response";
    }

    $boundary = md5(time());
    $headers = "From: $from$newLine";
    $headers .= "Reply-To: $email$newLine";
    $headers .= "Subject: $subject$newLine";
    $headers .= "MIME-Version: 1.0$newLine";

    if (!empty($images) && $isSell) {
        $headers .= "Content-Type: multipart/mixed; boundary=$boundary$newLine";
        $msgBody = "--$boundary$newLine";
        $msgBody .= "Content-Type: text/plain; charset=UTF-8$newLine";
        $msgBody .= "Content-Transfer-Encoding: 7bit$newLine$newLine";
        $msgBody .= $body . $newLine;

        foreach ($images as $i => $img) {
            if (preg_match('/^data:image\/(\w+);base64,/', $img, $matches)) {
                $ext = $matches[1];
                $imgData = base64_decode(str_replace($matches[0], '', $img));
                $filename = "ur_billede_" . ($i + 1) . ".$ext";

                $msgBody .= "$newLine--$boundary$newLine";
                $msgBody .= "Content-Type: image/$ext; name=\"$filename\"$newLine";
                $msgBody .= "Content-Transfer-Encoding: base64$newLine";
                $msgBody .= "Content-Disposition: attachment; filename=\"$filename\"$newLine$newLine";
                $msgBody .= chunk_split(base64_encode($imgData));
            }
        }
        $msgBody .= "$newLine--$boundary--$newLine";
    } else {
        $headers .= "Content-Type: multipart/mixed; boundary=$boundary$newLine";
        $msgBody = "--$boundary$newLine";
        $msgBody .= "Content-Type: text/plain; charset=UTF-8$newLine";
        $msgBody .= "Content-Transfer-Encoding: 7bit$newLine$newLine";
        $msgBody .= $body . $newLine;
        $msgBody .= "--$boundary--$newLine";
    }

    fputs($socket, "$headers$newLine$newLine$msgBody$newLine.$newLine");
    $response = fgets($socket, 515);
    if (substr($response, 0, 3) !== '250') {
        fclose($socket);
        return "Message send failed: $response";
    }

    fputs($socket, "QUIT$newLine");
    fclose($socket);

    return true;
}

$result = smtpMail($to, $subject, $body, $from, $smtpHost, $smtpPort, $smtpUser, $smtpPass, $isSell, $images);

if ($result === true) {
    logSubmission($data, 'SUCCESS');
    echo json_encode(['success' => true]);
} else {
    logSubmission($data, 'SMTP_ERROR: ' . $result);
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email: ' . $result]);
}
