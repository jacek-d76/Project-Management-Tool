-- Uruchom ten skrypt raz w phpMyAdmin (zakładka SQL)
-- Tworzy tabelę do przechowywania stanu aplikacji

CREATE TABLE IF NOT EXISTS `app_state` (
  `id`         TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `data`       LONGTEXT         NOT NULL,
  `updated_at` TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wstaw pusty stan (jeśli nie istnieje)
INSERT IGNORE INTO `app_state` (`id`, `data`) VALUES (1, '{}');
