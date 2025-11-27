# AI Trip Planner - Development Setup

## Running Locally with API Support

To test the API endpoints locally, you need to run **two servers**:

### 1. Install Vercel CLI (one-time setup)
```bash
npm install -g vercel
```

### 2. Run both servers

**Terminal 1 - Vercel Dev (API server on port 3000):**
```bash
vercel dev --listen 3000
```

**Terminal 2 - Vite Dev (Frontend on port 5173):**
```bash
npm run dev
```

The Vite dev server will proxy `/api` requests to the Vercel dev server at `localhost:3000`.

## Environment Variables

Make sure you have your API key set up:

**For local development:**
- Create `.env` file with: `ANTHROPIC_API_KEY=your_key_here`

**For Vercel deployment:**
- Add environment variable in Vercel dashboard: `ANTHROPIC_API_KEY`
- Or use Vercel CLI: `vercel env add ANTHROPIC_API_KEY`

## Deployment to Vercel

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

The `vercel.json` configuration ensures your API routes work correctly in production.
