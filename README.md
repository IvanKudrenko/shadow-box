# Shadow Box

Shadow Box is a minimalist browser puzzle-platformer about light and shadow.

## Main Mechanic

The player does not collect stars directly. The player's shadow collects the stars.

A light source casts the shadow away from the player. Moving closer to the light makes the shadow longer and stronger, which changes how far the shadow can reach to collect stars. After collecting the stars with the shadow, guide the player to the door.

## Controls

- Move: `A` / `D` or Left / Right arrows
- Jump: `Space`, `W`, or Up arrow
- Phone: swipe or drag left/right to move, swipe up to jump
- Restart level: `R`

## Features

- Custom Canvas game
- Built-in levels
- Level select
- Custom level builder
- Import and export custom levels as JSON
- Static community levels loaded from JSON files
- localStorage progress

## Community Levels

Community Levels are static JSON levels listed in `community-levels/community-levels.json`. Each listed level points to a regular exported Shadow Box level JSON file in the same folder.

From the website:

1. Save your level in Level Builder.
2. Open Custom Levels.
3. Press `Publish` on your saved level.
4. GitHub opens a prefilled community-level request. Add your author name and submit it.

Maintainer/manual flow:

1. Create a level in the existing Level Builder.
2. Use the export field to copy the level JSON.
3. Create a new `.json` file in `community-levels/`, for example `my-level.json`, and paste the exported JSON into it.
4. Add an entry to `community-levels/community-levels.json`.
5. Commit and push the changed JSON files. GitHub Pages will publish the level after the deployment finishes.

Example manifest entry:

```json
{
  "id": "my-level",
  "name": "My Level",
  "author": "Ivan",
  "difficulty": "Medium",
  "description": "A short note about the level.",
  "file": "my-level.json"
}
```

The game validates community levels before play. A level needs a player start, light source, door, at least one platform, and 1 to 3 stars.

## How To Run

Open `index.html` in a browser for the base game. To test Community Levels, run a simple local static server so the browser can fetch the manifest:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
