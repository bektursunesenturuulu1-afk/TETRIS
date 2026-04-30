# 🎮 NEON TETRIS

A stunning neon-themed Tetris game built with vanilla HTML5, CSS3, and JavaScript. No frameworks, no dependencies — just open `index.html` and play!

## ✨ Features

- 🌈 **Neon glow aesthetic** with animated grid background & floating particles
- 🎲 **7-Bag randomizer** for fair piece distribution
- 👻 **Ghost piece** shows landing position
- 🤲 **Hold piece** (press `C`)
- 🔄 **Wall kicks (SRS)** for smooth rotation
- ⚡ **DAS** (Delayed Auto Shift) for responsive movement
- 🔥 **Combo system** with bonus scoring
- 📈 **Level scaling** — speed increases every 10 lines
- 🏆 **High score** saved in localStorage
- 📱 **Touch support** for mobile (swipe gestures)
- ⏸ **Pause / Resume** at any time

## ⌨️ Controls

| Key | Action |
|-----|--------|
| `← →` | Move left / right |
| `↑` | Rotate piece |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `C` | Hold piece |
| `P` | Pause / Resume |

## 🚀 Play Online

> Deployed on Render: **[your-render-url]**

## 🛠 Local Development

No build step required — just open the file:

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/neon-tetris.git
cd neon-tetris

# Open in browser
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

## 📦 Deployment (Render)

This project is configured for automatic deployment on [Render](https://render.com) as a **Static Site**.

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Static Site**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` — click **Deploy**

That's it! No build command needed.

## 📁 Project Structure

```
tetris/
├── index.html     # Game layout & structure
├── style.css      # Neon design system & animations
├── game.js        # Full Tetris game engine
├── render.yaml    # Render deployment config
├── .gitignore
└── README.md
```

## 🎨 Scoring

| Clear | Points (× level) |
|-------|-----------------|
| Single | 100 |
| Double | 300 |
| Triple | 500 |
| **Tetris** | **800** |
| Hard drop | +2 per cell |
| Combos | Bonus multiplier |
