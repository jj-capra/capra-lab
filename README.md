# Capra Lab

The hub for JC's games: one iPhone-friendly page with a tile for each game.

## What's here

```
public/
  index.html             the hub page (all markup and styles in one file)
  assets/capra-lab-logo.png   the logo with its background removed
  apple-touch-icon.png   iPhone home-screen icon
  icon-192.png, icon-512.png, favicon.png
  manifest.webmanifest   lets the page open full-screen from the home screen
netlify.toml             tells Netlify to serve public/ (no build step)
```

## Games on the hub

| Game | Link |
| --- | --- |
| Par-Tee Time | Lab original, coming soon (will live at `/par-tee-time/`) |
| Mind Heist | https://mind-heist.netlify.app/ |
| Glacial Maw | https://glacialmaw.netlify.app/ |
| Primal Survival | https://primalsurvival365.netlify.app/ |
| My Doll Besties | https://my-doll-besties.netlify.app/ |
| Swerve Planet | https://swerve-planet.netlify.app/ |

## Adding a game

Copy one of the `<a class="tile">` blocks in `public/index.html`, then change the link, the `--tile` color, the icon, the name and the one-line tagline. Update the count in the `PICK AN EXPERIMENT` row.

## Launching Par-Tee Time

Par-Tee Time is a Capra Lab original, so it lives inside this site rather than on its own Netlify address:

1. Put the game in `public/par-tee-time/index.html`.
2. In `public/index.html`, change the Par-Tee Time `<div class="tile feature">` to `<a class="tile feature" href="/par-tee-time/">` (and its closing tag to `</a>`), and swap the `COMING SOON` chip for `<span class="chip live">PLAY</span>`.

## Deploying

Netlify deploys automatically from the `main` branch of this GitHub repository. In Netlify: **Add new site → Import an existing project → GitHub → capra-lab**, keep the settings it reads from `netlify.toml`, and deploy.
