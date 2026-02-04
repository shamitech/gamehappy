-- Open World Game Database Schema
-- Phase 1 Admin System Tables

-- Worlds (Admin-created top-level worlds/areas)
CREATE TABLE IF NOT EXISTS ow_worlds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description LONGTEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT FALSE,
    INDEX (created_by)
);

-- Places (Rooms, locations, areas within worlds)
CREATE TABLE IF NOT EXISTS ow_places (
    id INT PRIMARY KEY AUTO_INCREMENT,
    world_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description LONGTEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (world_id) REFERENCES ow_worlds(id) ON DELETE CASCADE,
    INDEX (created_by)
);

-- Directional Links between Places (North, South, East, West, Up, Down)
CREATE TABLE IF NOT EXISTS ow_place_exits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_place_id INT NOT NULL,
    to_place_id INT NOT NULL,
    direction VARCHAR(20) NOT NULL, -- 'north', 'south', 'east', 'west', 'up', 'down'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_place_id) REFERENCES ow_places(id) ON DELETE CASCADE,
    FOREIGN KEY (to_place_id) REFERENCES ow_places(id) ON DELETE CASCADE,
    UNIQUE KEY unique_exit (from_place_id, direction)
);

-- Objects (Items, furniture, NPCs, anything within a place)
CREATE TABLE IF NOT EXISTS ow_objects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    place_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description LONGTEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES ow_places(id) ON DELETE CASCADE,
    INDEX (created_by)
);

-- Mechanics (Actions/interactions for objects)
CREATE TABLE IF NOT EXISTS ow_mechanics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    object_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'open', 'examine', 'take', 'use', 'teleport', 'create_area', 'trigger'
    name VARCHAR(255) NOT NULL,
    description LONGTEXT,
    action_value LONGTEXT, -- JSON data for mechanic configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (object_id) REFERENCES ow_objects(id) ON DELETE CASCADE
);

-- Sub-areas (Areas created within objects, like inside drawers)
CREATE TABLE IF NOT EXISTS ow_sub_areas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    parent_object_id INT NOT NULL,
    place_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_object_id) REFERENCES ow_objects(id) ON DELETE CASCADE,
    FOREIGN KEY (place_id) REFERENCES ow_places(id) ON DELETE CASCADE
);

-- Plot Assignments (Land allocation for players)
CREATE TABLE IF NOT EXISTS ow_plot_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    world_id INT NOT NULL,
    assigned_to VARCHAR(100) NOT NULL,
    plot_name VARCHAR(255),
    description LONGTEXT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (world_id) REFERENCES ow_worlds(id) ON DELETE CASCADE,
    INDEX (assigned_to)
);

-- Permissions (Who can edit what)
CREATE TABLE IF NOT EXISTS ow_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    world_id INT,
    place_id INT,
    permission_type VARCHAR(50), -- 'admin', 'editor', 'viewer'
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (world_id) REFERENCES ow_worlds(id) ON DELETE CASCADE,
    FOREIGN KEY (place_id) REFERENCES ow_places(id) ON DELETE CASCADE,
    INDEX (username)
);

-- Indexes for performance
CREATE INDEX idx_ow_places_world ON ow_places(world_id);
CREATE INDEX idx_ow_objects_place ON ow_objects(place_id);
CREATE INDEX idx_ow_mechanics_object ON ow_mechanics(object_id);
CREATE INDEX idx_ow_place_exits_from ON ow_place_exits(from_place_id);
CREATE INDEX idx_ow_place_exits_to ON ow_place_exits(to_place_id);
