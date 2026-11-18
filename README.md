# Astro Salvage

![bounty](https://make.fun/badge/best-game-01.svg)
![rank](https://make.fun/badge/best-game-01/devinariyanto/astro-salvage/rank.svg)
![reward](https://make.fun/badge/best-game-01/devinariyanto/astro-salvage/reward.svg)

A top-down arcade salvage run for the [make.fun best-game-01 bounty](https://make.fun). Pilot a salvage drone through a debris field: scoop up cargo pods, dodge mines and tumbling asteroids, blast hazards with your pulse cannon, and survive long enough to draft upgrades between waves. Enemy drones start hunting you from wave 3. How deep can you salvage before your hull gives out?

100% vanilla JavaScript on an HTML5 canvas — no libraries, no external assets, no network requests. All art is drawn procedurally in code and all sound is synthesized live with WebAudio.

## How to play

| Key | Action |
| --- | --- |
| WASD / Arrow keys | Fly (with inertia) |
| Mouse | Aim (or aim follows your flight direction) |
| Space / Click | Fire pulse |
| Shift | Dash — brief shield, short cooldown |
| P | Pause |
| R | Restart |
| M | Mute |
| 1 / 2 / 3 or click | Pick an upgrade between waves |

Each wave asks you to salvage a quota of cargo pods. Chain pickups quickly to build a combo multiplier, clear the wave for a bonus, then draft 1 of 3 upgrades: reinforced hull, ion thrusters, tractor magnet, heavy pulse, spare drone, refined cargo (2x value), or phase dash. You have 3 hull hits — make them count. Your best score is saved locally.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

No build step. Screenshots are staged deterministically with `?shot=start|play|draft|end&seed=N`.

## Repo

https://github.com/devinariyanto/astro-salvage
