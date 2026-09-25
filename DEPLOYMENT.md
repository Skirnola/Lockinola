# Deploying Lockinola

The app runs on Cloudflare Workers. D1 stores progress, the Worker password protects the site, and Ollama Cloud handles hosted lesson reviews. Local reviews use the installed `qwen3.8:27b` model.

## Enable Ollama Cloud

1. Create an API key at [Ollama API keys](https://ollama.com/settings/keys). Check [Ollama pricing](https://ollama.com/pricing) for the current free usage allowance before relying on hosted reviews.
2. In this project directory, store the key directly in the existing Worker:

   ```powershell
   npx wrangler secret put OLLAMA_API_KEY --name lockinola
   ```

   Paste the key only at Wrangler's hidden prompt. Do not put it in the repository or a GitHub Actions secret.

3. Open `https://lockinola.skirnola.workers.dev/api/access`. Its `reviewConfigured` field should be `true`. After the updated code is deployed, sign in and try a hint or review from a lesson.

The hosted model is `gemma4:31b`. It can be changed with `OLLAMA_CLOUD_MODEL` in the deployment workflow. The browser sends lesson work to the Worker; the Worker sends it to Ollama with the stored key.

## Connect GitHub Actions

The repository has a workflow at `.github/workflows/deploy.yml`. It deploys on pushes to `main` and can also run from the Actions tab. Add these repository secrets under **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_ACCOUNT_ID`: the account ID shown in Cloudflare.
- `CLOUDFLARE_API_TOKEN`: the Cloudflare API token you saved under this repository secret name, scoped to this account with **Account → Workers Scripts → Edit** and **Account → D1 → Edit** permissions. The separate **Account → Workers → Admin** option is broader than this deployment needs.
- `CLOUDFLARE_D1_DATABASE_ID`: the ID of the existing `lockinola` D1 database.

The workflow installs dependencies, checks types and lint, builds the app, applies D1 migrations, and deploys the Worker. If a check fails, it does not deploy. Keep the site password, session secret, and Ollama key as Worker secrets; the workflow does not need their values.

You handle Git commits and pushes. Once the three GitHub secrets are saved, a push to `main` should start the first automatic deployment. Check the run in the repository's **Actions** tab and then open the hosted site.

## Local reviews

Start Ollama and make sure `ollama list` shows `qwen3.8:27b`. Copy `.env.example` to `.env.local`, then run `npm run dev`. Local Ollama uses `http://127.0.0.1:11434/api` and needs no API key.

Do not commit `.env.local`, API keys, passwords, backups, or downloaded models.
