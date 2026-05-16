# Shadow Box

Shadow Box is a minimalist browser puzzle-platformer about light and shadow.

## Main Mechanic

The player does not collect stars directly. The player's shadow collects the stars.

A light source casts the shadow away from the player. Moving closer to the light makes the shadow longer and stronger, which changes how far the shadow can reach to collect stars. After collecting the stars with the shadow, guide the player to the door.

## Controls

- Move: `A` / `D` or Left / Right arrows
- Jump: `Space`, `W`, or Up arrow
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

To add a community level:

1. Create a level in the existing Level Builder.
2. Save or export the level JSON.
3. Add the exported JSON file to `community-levels/`.
4. Add an entry to `community-levels/community-levels.json` with `id`, `name`, `author`, `difficulty`, `description`, and `file`.

The game validates community levels before play. A level needs a player start, light source, door, at least one platform, and 1 to 3 stars.

## How To Run

Open `index.html` in a browser for the base game. To test Community Levels, run a simple local static server so the browser can fetch the manifest:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
