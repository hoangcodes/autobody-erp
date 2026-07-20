# public/

Static assets served from the site root by Vite (no import needed — reference
them with an absolute path like `/abs-autobody-logo.png`).

## ABS Autobody logo

Drop the real **white** logo here:

```
public/abs-autobody-logo.png
```

`BrandLogo` (`src/components/BrandLogo.tsx`) renders `<img src="/abs-autobody-logo.png">`
automatically. While the file is absent the image fails to load and the
component falls back to a built-in white vector placeholder emblem, so the top
bar always renders. As soon as you add the PNG at the path above it is picked up
on the next reload — no code change required.

Because the mark is white, `BrandLogo` shows it inside a dark rounded badge in
light mode (so it stays visible) and drops that background in dark mode.
