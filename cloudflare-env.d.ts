declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    LOCKINOLA_HOSTED?: string;
    LOCKINOLA_ACCESS_PASSWORD?: string;
    LOCKINOLA_ACCESS_SECRET?: string;
    LOCKINOLA_REVIEW_DAILY_LIMIT?: string;
    LOCKINOLA_RUNNER_URL?: string;
    OLLAMA_API_KEY?: string;
    OLLAMA_BASE_URL?: string;
    OLLAMA_LOCAL_MODEL?: string;
    OLLAMA_CLOUD_MODEL?: string;
  }
}
