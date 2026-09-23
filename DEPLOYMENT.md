# Deploying Lockinola

Lockinola uses Cloudflare Workers for the application, D1 for synchronized progress, the existing private password for access, and Ollama for the tutor. Local development uses `qwen3.8:27b`; production calls Ollama Cloud.

## 1. Prepare local Ollama

Install Ollama, then download the local model:

```powershell
ollama pull qwen3.8:27b
```

Copy `.env.example` to `.env.local`. Keep `LOCKINOLA_HOSTED=false` locally. The tutor automatically calls `http://127.0.0.1:11434/api` and does not need an API key.

## 2. Create the Cloudflare resources

Sign in to Wrangler and create the database:

```powershell
npx wrangler login
npx wrangler d1 create lockinola
```

Save the returned database ID. It is used by local deployment and by the GitHub Actions secret named `CLOUDFLARE_D1_DATABASE_ID`.

Create an Ollama API key in your Ollama account. The hosted Worker needs this key because it calls `https://ollama.com/api`; the browser never receives it.

## 3. Configure Worker secrets once

Build and prepare the deployment configuration first:

```powershell
npm run build
$env:CLOUDFLARE_D1_DATABASE_ID="your-database-id"
npm run deploy:prepare
```

Add these secrets to the Worker. Use a unique password of at least 12 characters and a random session secret of at least 32 characters:

```powershell
npx wrangler secret put LOCKINOLA_ACCESS_PASSWORD --config dist/server/wrangler.json
npx wrangler secret put LOCKINOLA_ACCESS_SECRET --config dist/server/wrangler.json
npx wrangler secret put OLLAMA_API_KEY --config dist/server/wrangler.json
```

Apply the database migration and deploy the first version:

```powershell
npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.json
npx wrangler deploy --config dist/server/wrangler.json
```

The first browser that signs in uploads its existing local progress when the cloud database is empty. Later sign-ins load the cloud copy. Browser storage remains as a recovery copy.

## 4. Connect GitHub CI/CD

Create a private GitHub repository and push the `main` branch. In the repository's **Settings → Secrets and variables → Actions**, create:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_D1_DATABASE_ID`

The Cloudflare token needs permission to edit Workers and D1. The application password, session secret, and Ollama key stay in Cloudflare Worker secrets rather than the GitHub workflow.

Every push to `main` then installs dependencies, checks TypeScript, builds the site, applies pending D1 migrations, and deploys the Worker. A failed check prevents deployment. The workflow can also be run manually from GitHub Actions.

## 5. Normal update flow

```powershell
git add .
git commit -m "Describe the change"
git push
```

GitHub Actions publishes the update automatically. Do not commit `.env.local`, API keys, passwords, database credentials, backups, or downloaded Ollama models.
