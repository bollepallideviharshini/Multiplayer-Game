# Color Clash

A two-player, real-time reaction game. Create a room, share its link, and race to tap the tile matching the color shown. The first player to 5 points wins; a wrong tap awards the point to the rival. Each round lasts up to 10 seconds. If neither player reaches 5 after 10 rounds, the higher score wins (ties continue to sudden death).

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
npm start
```

Open http://localhost:3000 in two browser windows or devices on the same network. For devices on the same Wi-Fi, use the host computer's local IP instead of `localhost`.

## Publish on Vercel

The browser game is served as static files, and `api/ws.js` is the Vercel WebSocket Function. Vercel supports WebSockets on Functions with Fluid Compute. To deploy, install the Vercel CLI, sign in with `vercel login`, then run `vercel --prod` from this folder. You can also import the project in the Vercel dashboard.

Game room state currently lives in the WebSocket function's memory. Vercel may send two players' connections to different function instances, so reliable multiplayer across instances requires a shared Redis/pub-sub store. The current setup is best for a small demo and should be upgraded with shared room state before relying on it for public play.
