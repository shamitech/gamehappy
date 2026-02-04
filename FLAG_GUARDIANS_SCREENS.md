# Flag Guardians - Game Screens Overview

## Screen Flow Diagram

```
┌─────────────────────┐
│   HOME SCREEN       │
│  FLAG GUARDIANS     │
│                     │
│ [Create Game]       │
│ [Join Game]         │
│ [How to Play]       │
└──┬────────┬────┬────┘
   │        │    │
   ▼        ▼    ▼
┌──────┐ ┌─────┐ ┌─────────────────┐
│CREATE│ │ JOIN │ │ HOW TO PLAY     │
│SCREEN│ │SCREEN│ │                 │
└──┬───┘ └──┬──┘ └─────────────────┘
   │        │           ▲
   └────┬───┘           │
        ▼               │
    ┌──────────────────────────────┐
    │  LOBBY SCREEN                │
    │  Game Code: AB3X7Z           │
    │  Your Team: (select Red/Blue)│
    │                              │
    │  🔴 RED TEAM      🔵 BLUE    │
    │  - Player 1       - Player 2 │
    │  - Player 3       - Player 4 │
    │                              │
    │  Players: 4/8                │
    │  [Start Game] [Leave Game]   │
    └──┬──────────────────────────┘
       │ (minimum 2 players + teams selected)
       ▼
    ┌──────────────────────────────┐
    │  GAME SCREEN                 │
    │                              │
    │  🔴 Red: 2  Round 1  Blue: 1 │
    │                              │
    │  Your Team: 🔴 Red           │
    │  - Player 1                  │
    │  - Player 3                  │
    │                              │
    │  🚩 Your Flag: Secure        │
    │  ⚔️  Enemy Flag: Defending   │
    │                              │
    │  [Game Log...]               │
    │  [Leave Game]                │
    └──┬───────────────────────────┘
       │ (when game ends)
       ▼
    ┌──────────────────────────────┐
    │  RESULTS SCREEN              │
    │                              │
    │  🔴 RED TEAM WINS! 🔴        │
    │                              │
    │  Final Scores:               │
    │  🔴 Red Team:  3             │
    │  🔵 Blue Team: 1             │
    │                              │
    │  Team Results:               │
    │  🔴 Red Team                 │
    │  - Player 1 ✓                │
    │  - Player 3 ✓                │
    │                              │
    │  🔵 Blue Team                │
    │  - Player 2 ✗                │
    │  - Player 4 ✗                │
    │                              │
    │  [Play Again] [Back to Home] │
    └──────────────────────────────┘
```

## Screen Details

### 1. HOME SCREEN
**Purpose**: Main entry point for the game
- Game title: "FLAG GUARDIANS"
- Tagline: "Defend Your Territory. Capture the Opposition."
- Three main buttons:
  - Create Game
  - Join Game
  - How to Play

**Styling**: 
- Red and Blue gradients
- Modern Orbitron font for title
- Neon glow effects
- Centered layout

### 2. HOW TO PLAY SCREEN
**Purpose**: Game instructions and rules
- Objective explanation
- Team descriptions (Red/Blue)
- Game rules (minimum 2 players)
- Game flow overview
- How to play link back to home

**Content**:
- 🎯 Objective
- 👥 Teams
- 🎮 Game Rules
- ⚔️ Game Flow

### 3. CREATE GAME SCREEN
**Purpose**: Start a new game
- Player name input
- Create Game button
- Back to home navigation
- Error/success messages

**Validation**:
- Player name required
- Connection check
- Generates 6-character code on server

### 4. JOIN GAME SCREEN
**Purpose**: Join existing game
- Game code input (6 characters, uppercase)
- Player name input
- Join Game button
- Back to home navigation
- Error/success messages

**Validation**:
- Game code must be 6 characters
- Game must exist
- Game must not be started
- Player name required

### 5. LOBBY SCREEN
**Purpose**: Prepare for game start
- Display game code prominently
- Show player's name
- Host badge (if host)
- Team selection (Red/Blue)
  - Shows players in each team
  - Real-time updates
- Player count display
- Start Game button (host only, 2+ players, all selected teams)
- Leave Game button

**Real-Time Updates**:
- Team lists update when players join
- Player count updates
- Start button enabled when conditions met

**Team Panel Features**:
- Red Team section (🔴)
- Blue Team section (🔵)
- Join buttons for each team
- Display of current team members
- Visual indication of selected team

### 6. GAME SCREEN
**Purpose**: Active gameplay
- Header with scores and round
  - Red team score
  - Current round
  - Blue team score
- My Team section
  - Team indicator
  - List of teammates
- Game Actions
  - Flag status (Your Flag / Enemy Flag)
  - Current status of flags
- Game Log
  - Real-time notifications
  - Action updates
- Leave button

**Elements**:
- 🚩 Flag indicators
- ⚔️ Defense indicators
- Team color coding
- Score tracking

### 7. RESULTS SCREEN
**Purpose**: Display game outcome
- Winner announcement with emoji
- Final scores display
- Team results breakdown
  - Red Team section
  - Blue Team section
  - Player status (win/loss)
- Navigation buttons
  - Play Again (creates new game)
  - Back to Home

**Result Display**:
- Winning team emphasized
- Final scores clearly shown
- Per-team player listings
- Visual team coloring

## Styling Details

### Color Scheme
- **Primary Red**: #ff3b3b
- **Primary Blue**: #3b7eff
- **Dark Background**: #0a0e1a
- **Card Background**: #1a1f2e
- **Text Light**: #f0f2f5
- **Accent Gold**: #ffd700

### Typography
- **Logo Font**: Orbitron (futuristic)
- **Body Font**: Rajdhani (modern, clean)
- **Sizes**: 
  - H1/H2: 2.2-2.8rem
  - H3: 1.1-1.2rem
  - Body: 0.9-1rem

### Responsive Design
- **Desktop**: 500px max container width
- **Tablet**: Full width with padding
- **Mobile**: 480px and below optimized
- **Flex layout**: Flexible grid system

## Interaction Patterns

### Input Validation
- Game code: 6 uppercase alphanumeric
- Player name: 1-20 characters
- Real-time validation feedback

### Button States
- Default: Enabled with hover effects
- Disabled: Greyed out when conditions not met
- Active: Highlighted when selected
- Hover: Lift effect with shadow

### Loading States
- Connection indicators
- Message display system
- Success/Error/Info message types

## Accessibility Features

- Semantic HTML structure
- Clear color contrast (WCAG compliant)
- Button focus states
- Keyboard navigation support
- Responsive layout
- Font size scaling
- Icon usage with text labels

## Mobile Optimization

- Touch-friendly button sizes (min 44x44px)
- Readable text without zooming
- Single-column layout
- Minimal scrolling required
- Fast load times
- Optimized animations
