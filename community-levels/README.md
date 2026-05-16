# Community Levels

Community levels are regular Shadow Box Level Builder exports. Do not change the level format when submitting a level.

## Submit a Level

1. Open Shadow Box and create a level in the existing Level Builder.
2. Save or export the level JSON.
3. Put the exported `.json` file in this `community-levels/` folder.
4. Add a manifest entry to `community-levels.json`:

```json
{
  "id": "my-level-id",
  "name": "My Level",
  "author": "Unknown Author",
  "difficulty": "Easy",
  "description": "A short note about the level.",
  "file": "my-level-id.json"
}
```

## Requirements

- Keep the JSON in the same exported format used by Level Builder.
- Include a player start, light source, door, at least one platform, and 1 to 3 stars.
- Keep `file` as a relative filename inside this folder.
- If author or other metadata is not known, use simple fallback text such as `Unknown Author`.

Broken or incomplete levels will be skipped during play and the game will show: `This community level could not be loaded.`
