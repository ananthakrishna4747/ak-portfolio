/**
 * /api/voice — Text-to-speech proxy
 *
 * Uses ElevenLabs API when ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID are set.
 * Falls back to a 204 No Content so the frontend switches to Web Speech API.
 *
 * ElevenLabs setup:
 *   1. Sign up at elevenlabs.io (free tier: 10,000 chars/month)
 *   2. Create a voice clone or pick a preset voice
 *   3. Copy the Voice ID from the voice card
 *   4. Set env vars: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing text" });
  }

  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID =
    process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel (default)

  if (!ELEVEN_KEY) {
    // No key configured — return 204 so frontend falls back to Web Speech API
    return res.status(204).end();
  }

  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVEN_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.substring(0, 1000), // safety limit
          model_id: "eleven_turbo_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error("ElevenLabs error:", elevenRes.status, errText);
      return res.status(204).end(); // Fall back to client-side TTS
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.byteLength);
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error("Voice API error:", err);
    return res.status(204).end(); // Fall back gracefully
  }
}
