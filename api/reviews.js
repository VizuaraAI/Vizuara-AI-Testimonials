import { buildPayload } from "../scripts/sync-senja.mjs";

export default async function handler(req, res) {
  try {
    const payload = await buildPayload();
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch Senja testimonials",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
