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
- Global community publishing with Supabase
- localStorage progress

## Community Levels

Community Levels can come from two places: static JSON levels listed in `community-levels/community-levels.json`, and live levels published through Supabase.

From the website:

1. Create a level in Level Builder.
2. Press `Publish`.
3. Confirm the alert. Once Supabase is configured, the level appears in Community Levels for everyone.

Saved levels also have a `Publish` button in Custom Levels.

To enable global publishing:

1. Create a Supabase project.
2. Run `supabase-community.sql` in the Supabase SQL editor.
3. Put the project URL and public anon key in `community-config.js`.
4. Deploy `community-config.js` with the site.

Players can remove levels they published from the same browser. The browser stores a private owner key locally and uses it only for removal.

Maintainer/manual static flow:

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
