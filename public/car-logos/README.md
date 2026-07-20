# Car brand logos

Drop **licensed** automaker logo images here to have them shown automatically by
the `CarBrandMark` component (used on the workflow board, order cards, and the
order-detail sidebar wherever a vehicle make is displayed).

## How it works

For a vehicle whose make is, say, `BMW`, `CarBrandMark` requests:

```
/car-logos/bmw.png
```

The file name is the make **lowercased**, with every run of non-alphanumeric
characters collapsed to a single hyphen (`-`):

| Make            | Expected file name          |
| --------------- | --------------------------- |
| BMW             | `bmw.png`                   |
| Honda           | `honda.png`                 |
| Toyota          | `toyota.png`                |
| Mercedes-Benz   | `mercedes-benz.png`         |
| Land Rover      | `land-rover.png`            |
| Ram             | `ram.png`                   |

## Fallback behavior

- If the matching `<make>.png` file **is present**, it is displayed.
- If it is **absent** (the image request 404s), the component falls back to a
  colored **monogram badge** (e.g. `BMW`, `TO` for Toyota).
- If the vehicle has **no make**, a generic car icon is shown.

So the UI always renders something sensible — adding logo files is purely an
enhancement.

## Important

Do **not** commit real automaker logos unless you have the rights/license to use
them. They are trademarked. This folder ships intentionally empty (only this
README); the monogram fallback is the safe, unlicensed default.

Recommended format: square, transparent-background PNG (e.g. 64×64 or 128×128).
