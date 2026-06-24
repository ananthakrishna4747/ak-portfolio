# Deploy to Vercel (free tier)

## 1. Install Vercel CLI
```bash
npm i -g vercel
```

## 2. Clone and enter the portfolio directory
```bash
cd portfolio
npm install
```

## 3. Deploy (first time)
```bash
vercel
```
Follow prompts: link to your Vercel account, select "portfolio" as project root.

## 4. Set environment variables (Vercel dashboard)
Go to: vercel.com → your project → Settings → Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | Claude API key from console.anthropic.com |
| `ELEVENLABS_API_KEY` | Optional | ElevenLabs key (free: 10k chars/month) |
| `ELEVENLABS_VOICE_ID` | Optional | Your cloned voice ID from elevenlabs.io |
| `CAL_API_KEY` | Optional | Cal.com API key (free plan) |
| `CAL_EVENT_TYPE_SLUG` | Optional | Your Cal.com event slug (e.g. `30min`) |
| `CAL_USERNAME` | Optional | Your Cal.com username |

## 5. Redeploy after setting env vars
```bash
vercel --prod
```

## What works without API keys
- **Full portfolio UI** — everything renders without any keys
- **Chat** — shows "connection issue" and falls back gracefully
- **Voice** — falls back to Web Speech API (browser TTS)
- **Scheduling** — logs request, shows manual follow-up message

## What requires API keys
| Feature | Key needed |
|---|---|
| AI chatbot (real Claude responses) | `ANTHROPIC_API_KEY` |
| Voice clone (your actual voice) | `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` |
| Real calendar booking | `CAL_API_KEY` + `CAL_EVENT_TYPE_SLUG` |

## Local development
```bash
cp .env.example .env.local
# Fill in your keys
vercel dev   # runs at http://localhost:3000
```

## Cost
- **Vercel**: Free (Hobby plan, 100GB bandwidth/month)
- **Claude API**: ~$0.25 per 1M input tokens (haiku model, very cheap)
- **ElevenLabs**: Free tier = 10,000 chars/month (~150 voice plays)
- **Cal.com**: Free forever for individuals
