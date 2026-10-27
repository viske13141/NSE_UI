# Deploy the NSE dist

The `dist` folder contains only the NSE app. Opening `/` redirects to `/nse-login`. Dashboard routes use `/mutual-funds/*`, and older `/nse-dashboard/*` links redirect to their matching sections.

## Nginx hosting

1. Copy the contents of `dist/` into `/var/www/nse/` on the hosting server.
2. Install the supplied `nginx.conf` server block in your Nginx configuration. Set `server_name` to your domain, adjust `root` and the operating system's CA bundle path if necessary, and enable HTTPS using your hosting provider's certificate setup.
3. Run `nginx -t`, then reload Nginx using your server's normal service management command.
4. Open `/nse-login` on that host. Sign in with valid NSE provider credentials.

This configuration forwards `/nse-api/` to `https://nse.lendrixventech.com/api/v1/`, the API used by the main project's development configuration. It passes each request's authorization header through. Confirm that this is the intended provider environment before using live accounts.

The SPA fallback lets dashboard URLs work when opened directly or refreshed. Static asset paths return 404 if missing.

## Other hosting

Configure the same two rules: forward `/nse-api/*` to the provider's `/api/v1/*`, and serve `index.html` for frontend routes. A static file host without an API proxy needs an additional backend or reverse proxy. Do not upload any `.env` files or credentials to the public directory.

## Local run with the supplied backend

Use the complete `nse-ready-to-send` folder, run `npm run setup`, then `npm run dev`, and open http://localhost:5000/nse-login. Configure `server/.env` when needed. This local backend uses the provider URL in `server/.env.example` by default; set `NSE_BASE_URL=https://nse.lendrixventech.com` to match the Nginx configuration.

The build and navigation can be checked locally; live authentication and transactions require provider access. Hosting configuration must be applied on the recipient's server.
