<?php
define('NI_ERP', true);
require_once __DIR__ . '/includes/auth.php';

checkRememberMe();
if (isLoggedIn()) {
    header('Location: dashboard.php');
    exit;
}

$error = $success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!validateCsrfToken($_POST['csrf_token'] ?? '')) {
        $error = 'Invalid security token. Please refresh and try again.';
    } else {
        $email    = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $remember = isset($_POST['remember']);

        if (empty($email) || empty($password)) {
            $error = 'Please enter both email and password.';
        } else {
            $result = attemptLogin($email, $password, $remember);
            if ($result['success']) {
                header('Location: dashboard.php');
                exit;
            } else {
                $error = $result['message'];
            }
        }
    }
}

$csrf  = generateCsrfToken();
$flash = getFlash();
if ($flash) {
    if ($flash['type'] === 'success') $success = $flash['message'];
    else $error = $flash['message'];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | NI Group Realty ERP</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="login-page">
    <div class="login-wrapper">
        <div class="login-card">
            <div class="login-brand">
                <div class="logo">NI</div>
                <h1>NI GROUP REALTY</h1>
                <p>ERP Admin Management System</p>
                <div class="domain">admin.nigrouprealty.com</div>
            </div>

            <?php if ($error): ?>
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> <?= htmlspecialchars($error) ?>