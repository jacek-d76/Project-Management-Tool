<?php
// Skopiuj ten plik jako config.php i uzupełnij dane
// Ten plik NIE trafia na GitHub (config.php jest w .gitignore)

define('DB_HOST', 'localhost');
define('DB_NAME', 'host235051_pm_panel');
define('DB_USER', 'host235051_pm_panel');
define('DB_PASS', 'WPISZ_TUTAJ_SWOJE_HASLO');

// Klucz API - wpisz dowolny długi ciąg znaków (min 32 znaki)
// Ten sam ciąg musisz wpisać w GitHub Secrets jako VITE_API_KEY
define('API_KEY', 'WPISZ_TUTAJ_KLUCZ_API');
