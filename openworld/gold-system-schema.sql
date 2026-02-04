-- Gold Economy System Tables
-- Phase 2: Player System

-- Players (User profiles with gold balance)
CREATE TABLE IF NOT EXISTS ow_players (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    gold INT DEFAULT 1000, -- Starting gold amount
    current_place_id INT, -- Where player currently is in the world
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (current_place_id) REFERENCES ow_places(id) ON DELETE SET NULL,
    INDEX (username)
);

-- Add owner_id column to ow_objects to track ownership
-- ALTER TABLE ow_objects ADD COLUMN owner_id INT DEFAULT NULL;
-- ALTER TABLE ow_objects ADD FOREIGN KEY (owner_id) REFERENCES ow_players(id) ON DELETE SET NULL;
-- ALTER TABLE ow_objects ADD INDEX idx_ow_objects_owner (owner_id);

-- Ownership tracking (who owns what object)
CREATE TABLE IF NOT EXISTS ow_ownership (
    id INT PRIMARY KEY AUTO_INCREMENT,
    object_id INT NOT NULL,
    player_id INT NOT NULL,
    original_place_id INT, -- Where it was originally
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (object_id) REFERENCES ow_objects(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES ow_players(id) ON DELETE CASCADE,
    INDEX (player_id),
    INDEX (object_id)
);

-- Gold transactions (audit trail)
CREATE TABLE IF NOT EXISTS ow_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'purchase', 'reward', 'penalty', 'transfer'
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    object_id INT, -- Related object if applicable
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES ow_players(id) ON DELETE CASCADE,
    FOREIGN KEY (object_id) REFERENCES ow_objects(id) ON DELETE SET NULL,
    INDEX (player_id),
    INDEX (created_at)
);

-- Player inventory (objects player is carrying)
CREATE TABLE IF NOT EXISTS ow_inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    object_id INT NOT NULL,
    quantity INT DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES ow_players(id) ON DELETE CASCADE,
    FOREIGN KEY (object_id) REFERENCES ow_objects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_player_object (player_id, object_id),
    INDEX (player_id)
);
