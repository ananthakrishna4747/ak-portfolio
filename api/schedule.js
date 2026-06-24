/**
 * /api/schedule — Cal.com booking proxy
 *
 * Collects answers from the 4-question AI scheduling flow and creates
 * a Cal.com booking via their v2 API.
 *
 * Cal.com setup (free):
 *   1. Sign up at cal.com and create a free account
 *   2. Go to Settings → Developer → API Keys → Create API Key
 *   3. Create an event type (e.g. "30-min intro call") and note the event slug
 *   4. Set env vars: CAL_API_KEY, CAL_EVENT_TYPE_SLUG, CAL_USERNAME
 *
 * The 4 collected answers map to:
 *   schedCollected[0] → name + email
 *   schedCollected[1] → purpose (job / collab / consulting)
 *   schedCollected[2] → timezone
 *   schedCollected[3] → preferred time + days
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const body = req.body || {};

  // Parse name + email from answer[0]: "John Doe, john@example.com"
  const nameEmail = String(body[0] || body["0"] || "").trim();
  const emailMatch = nameEmail.match(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i
  );
  const guestEmail = emailMatch ? emailMatch[0] : null;
  const guestName =
    nameEmail.replace(emailMatch ? emailMatch[0] : "", "").replace(/[,]/g, "").trim() ||
    "Portfolio Visitor";

  const purpose = String(body[1] || body["1"] || "General inquiry").trim();
  const timezone = String(body[2] || body["2"] || "UTC").trim();
  const timePreference = String(body[3] || body["3"] || "Flexible").trim();

  const CAL_KEY = process.env.CAL_API_KEY;
  const EVENT_SLUG = process.env.CAL_EVENT_TYPE_SLUG || "30min";
  const CAL_USER = process.env.CAL_USERNAME || "ananthakrishna";

  // If no Cal.com API key, return a success response with manual follow-up
  if (!CAL_KEY) {
    console.log("Schedule request (no Cal.com key):", {
      guestName,
      guestEmail,
      purpose,
      timezone,
      timePreference,
    });
    return res.status(200).json({
      message: `Thanks ${guestName}! Your request has been logged. Krishna will reach out within 24 hours to confirm your meeting slot.`,
      bookingId: null,
    });
  }

  // Find the next available slot (simplified: book 3 business days out at 10am)
  const startDate = getNextBusinessDay(3);
  const adjustedTime = getPreferredTime(timePreference, startDate, timezone);

  try {
    // Cal.com v2 API: Create a booking
    const calRes = await fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CAL_KEY}`,
        "Content-Type": "application/json",
        "cal-api-version": "2024-08-13",
      },
      body: JSON.stringify({
        eventTypeSlug: EVENT_SLUG,
        username: CAL_USER,
        start: adjustedTime.toISOString(),
        attendee: {
          name: guestName,
          email: guestEmail || "noemail@portfolio.ai",
          timeZone: normalizeTimezone(timezone),
          language: "en",
        },
        metadata: {
          purpose,
          timePreference,
          source: "portfolio-ai-agent",
        },
      }),
    });

    const calData = await calRes.json();

    if (!calRes.ok) {
      console.error("Cal.com error:", calData);
      // Still return success — booking will be manual
      return res.status(200).json({
        message: `Thanks ${guestName}! The calendar link had a hiccup but your request was logged. Krishna will manually send a Cal.com invite.`,
        bookingId: null,
        calError: calData.message,
      });
    }

    return res.status(200).json({
      message: `Meeting booked! A Cal.com confirmation has been sent to ${guestEmail || "your email"}. Krishna will see you soon!`,
      bookingId: calData.data?.uid || calData.uid || "confirmed",
    });
  } catch (err) {
    console.error("Schedule API error:", err);
    return res.status(200).json({
      message: `Thanks ${guestName}! There was a scheduling hiccup. Krishna will reach out manually within 24 hours to confirm.`,
      bookingId: null,
    });
  }
}

function getNextBusinessDay(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  // Skip weekends
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

function getPreferredTime(preference, baseDate, timezone) {
  const d = new Date(baseDate);
  const pref = preference.toLowerCase();
  // Morning = 10am, afternoon = 2pm, default 10am
  const hour = pref.includes("afternoon") || pref.includes("pm") ? 14 : 10;
  d.setHours(hour, 0, 0, 0);
  return d;
}

function normalizeTimezone(tz) {
  // Map common phrases to IANA timezone
  const map = {
    est: "America/New_York",
    cst: "America/Chicago",
    mst: "America/Denver",
    pst: "America/Los_Angeles",
    ist: "Asia/Kolkata",
    gmt: "Europe/London",
    utc: "UTC",
  };
  const lower = tz.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v;
  }
  // If it looks like an IANA zone already (contains /)
  if (tz.includes("/")) return tz;
  return "America/Chicago"; // Default to CST (UNT location)
}
