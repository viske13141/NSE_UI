# NSE ready to send

This folder contains the built NSE frontend in `dist/` and its API proxy in `server/`. Send this entire folder to run both together. Source code and installed dependencies are not included.

## Run

Install Node.js 22.12 or later. Open a terminal in this folder and run:

```sh
npm.cmd run setup
npm.cmd run dev
```

Open http://localhost:5000/nse-login. Keep the terminal running. On Windows you can instead double-click `setup.cmd` once, then `start.cmd`.

Run these commands inside `nse-ready-to-send`, not the parent Lendrix project. The parent project's `npm run dev` starts the full website on port 8081. This folder serves the built NSE app on port 5000; editing frontend source requires the `nse-dashboard-clean` source folder and a new build.

To change the provider URL or port, copy `server/.env.example` to `server/.env` and edit it. Live account access requires valid NSE provider credentials and a reachable provider. No local credentials are included.

For public hosting, configure the hosting service or reverse proxy to reach this server on port 5000. The server binds to localhost by default and serves both the frontend and `/nse-api`.
