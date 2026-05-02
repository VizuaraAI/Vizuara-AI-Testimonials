import { readFileSync, writeFileSync } from "node:fs";

const API_BASE = "https://api.senja.io/v1";
const API_KEY = process.env.SENJA_API_KEY || readLocalKey();
const KNOWN_TESTIMONIALS = readKnownTestimonials();

const EXCLUDED_NAMES = new Set([
  "prathamesh joshi",
  "rajat dandekar",
  "sreedath panat",
  "prakash srinivasan",
]);

const EXCLUDED_TESTIMONIAL_IDS = new Set([
  "61c415bb-bb65-40bf-882c-6e26a56b4b8c", // Prathamesh Joshi
  "0cfd67b2-3d55-46ef-a6af-58577c5ac239", // Rajat Dandekar
  "b6723215-62d4-438e-a4db-7c90561c0f28", // Neel Desai: applications
  "8b4b5ab5-effd-4d9f-9923-6f4554b449e7", // Priyanshu Kumar: applications
  "a524627d-1631-4ce8-9ad2-33ec1bcc4f1a", // Radhika Shukla: AI High School Researcher Program
  "2a32e51f-42cc-4567-affe-fcbc6c7734aa", // Dharmveer Jain: AI High School Researcher Program
  "e69d8e9f-6e5c-44cb-9135-725d2897042f", // Daksh Gandhi: AI High School Researcher Program
  "b6b038a0-dfca-4c62-ae4b-4c9f70071707",
  "5baccaf7-b0fb-496c-ac6e-97555b9cac9b",
  "145fc64f-5d3c-4f84-acc9-5796d451ca3c",
  "60b08783-beaf-4734-a11d-2f28e6ec7622",
  "67f27a20-1c9a-4035-95be-9ba2b713f8b0",
  "1530fbc5-69d5-4604-9f90-cfd25b16b6f3",
  "9f3887b3-3715-4b71-b3d0-ef07aecb6c54",
  "4b937a96-c7cd-430a-af6f-e203992e0936",
  "1c443f5e-0b31-4dc6-bdd0-d97ba8547760",
  "36acbbe5-2af9-4e56-956d-e218a345d754",
]);

const EXCLUDED_TERMS = /\b(videsh|sop|resume|statement of purpose|graduate application|grad school|admission offers?|university of michigan|university of pennsylvania|ai high school researcher|high school researcher program)\b/i;

// These existing Senja video IDs have enough row metadata to keep even before
// transcript-based classification. Future videos are kept only when transcript
// or metadata provides a confident AI/ML signal.
const KNOWN_CONFIDENT_VIDEO_IDS = new Set([
  "631dd46e-6542-4a95-812c-4435d7fa6706", // Amit Ss Jain: AI Agents
  "a5eea6a4-ca03-4f2b-a572-521310ed33a7", // Monideepa Roy: AI Agents
  "0246b0bb-11bb-4522-b475-0f766e762e87", // Ravi Chandra: GenAI/Foundation
  "fd0ce9c0-4361-4577-ba34-500588dcff77",
  "6fc17443-bbe8-463d-aecc-cc0fb21e4180",
  "77a3a5b9-260b-4240-b86a-374662eba5a7",
  "f59c708e-6cdc-4436-a2d2-e9f8763b0a3c",
  "0aa6ff69-4fce-4097-b1e1-7f8fff045b11",
  "04083728-9f03-435e-9cb8-1007fc7cf4cb",
  "1403c579-0233-4913-bd56-46a5e36a1aa5",
  "d5cc7d43-102d-44e8-b5f5-d70557199bc0",
  "62010d73-2b6b-4dba-b734-648efa19ae6a",
  "96e4aa0e-efd1-4408-9c1b-0069ce145b79",
  "32392a0f-d635-4d1b-a82c-12822fe07158",
]);

function readLocalKey() {
  try {
    return readFileSync("env.local", "utf8").trim();
  } catch {
    return "";
  }
}

function readKnownTestimonials() {
  try {
    return JSON.parse(readFileSync("config/known-testimonials.json", "utf8"));
  } catch {
    return {};
  }
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function has(text, pattern) {
  return pattern.test(text);
}

async function senja(path) {
  if (!API_KEY) throw new Error("Missing SENJA_API_KEY. Add it as an environment variable or local env.local.");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Senja API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fetchAllTestimonials() {
  const limit = 1000;
  const first = await senja(`/testimonials?limit=${limit}&sort=date&order=desc`);
  const rows = first.testimonials ?? [];
  const total = first.total ?? rows.length;
  let page = 2;
  while (rows.length < total) {
    const next = await senja(`/testimonials?limit=${limit}&page=${page}&sort=date&order=desc`);
    const chunk = next.testimonials ?? [];
    if (chunk.length === 0) break;
    rows.push(...chunk);
    page += 1;
  }
  return rows;
}

async function hydrateVideo(testimonial) {
  if (testimonial.type !== "video") return testimonial;
  const detail = await senja(`/testimonials/${testimonial.id}`);
  return { ...testimonial, ...(detail.testimonial ?? {}) };
}

function combinedText(row) {
  return [
    row.title,
    row.text,
    row.video?.transcript,
    row.customer_name,
    row.customer_tagline,
    row.customer_company,
    ...(row.tags ?? []),
  ].map(clean).join(" ");
}

function isExcluded(row) {
  const name = clean(row.customer_name).toLowerCase();
  const text = combinedText(row);
  if (EXCLUDED_TESTIMONIAL_IDS.has(row.id)) return true;
  if (EXCLUDED_NAMES.has(name)) return true;
  if (EXCLUDED_TERMS.test(text)) return true;
  return false;
}

function courseFor(row) {
  const knownCourse = KNOWN_TESTIMONIALS[row.id]?.course;
  if (knownCourse) return knownCourse;

  const text = combinedText(row);
  if (has(text, /\b(VLA|world models?|world model)\b/i)) return "VLA and World Models";
  if (has(text, /\b(physical AI|real robot arms?|robot learning|robotics policies|SO-101|modern robotics)\b/i)) return "Modern Robot Learning Bootcamp";
  if (has(text, /\bcontext engineering\b/i)) return "Context Engineering for LLMs";
  if (has(text, /\b(SciML|scientific machine learning|sustainable agriculture)\b/i)) return "SciML Research Bootcamp";
  if (has(text, /\b(modern software engineering|Claude Code|CI\/CD|testing pyramids?)\b/i)) return "Modern Software Engineering";
  if (has(text, /\b(5D Parallelism|GPU Parallelism|parallelism workshop|distributed training|LLM optimization|parallelization|data \(DP\)|tensor \(TP\)|pipeline \(PP\))\b/i)) return "5D Parallelism / GPU Systems";
  if (has(text, /\b(Transformers for Vision|computer vision|vision bootcamp|CNNs?|ViTs?|Swin|DETR|Mask2Former|TimeSformer|visual data|vision transformers?)\b/i)) return "Transformers for Vision / Computer Vision";
  if (has(text, /\b(Clawdbot|Clawd|Moltbot|memory architecture|autonomous agents?|B2B AI Agent|tool calling|MCP)\b/i)) return "ClawdBot / Autonomous Agents Workshop";
  if (has(text, /\b(AI Agents Bootcamp|agentic AI|AI agents?|multiagents?|LangChain|LangGraph)\b/i)) return "AI Agents Bootcamp";
  if (has(text, /\b(RAG|chunking|embedding|vector databases?)\b/i)) return "Production-grade RAG Pipeline";
  if (has(text, /\b(Foundation of AI Model|Generative AI Fundamentals|LLM from scratch|large language models?|LLMs evolved|GenAI foundations|backend of different AI models|tokenization|next token)\b/i)) return "Generative AI Fundamentals / Foundation of AI Models";
  if (has(text, /\b(ML & DL Mastery|linear algebra|probability and statistics)\b/i)) return "ML & DL Mastery";
  if (has(text, /\b(LIVE AI Courses?|Machine Learning|Deep Learning|Data Scientist|Software Engineer|Product Manager|Boeing|Navy Federal|Symbio)\b/i)) return "ML & DL Mastery";
  return "";
}

function hasConfidentAiMlSignal(row, course) {
  if (row.type === "video" && !course) return false;
  if (KNOWN_TESTIMONIALS[row.id]?.include) return true;
  if (course) return true;
  if (row.type !== "video") return false;
  if (KNOWN_CONFIDENT_VIDEO_IDS.has(row.id)) return true;
  return has(combinedText(row), /\b(AI|ML|machine learning|deep learning|LLM|agentic|data scientist|software engineer|LIVE AI Courses?)\b/i);
}

function videoUrl(row) {
  return row.video?.mp4_urls?.high || row.video?.mp4_urls?.medium || row.video_url || "";
}

function normalize(row) {
  const course = courseFor(row);
  return {
    id: row.id,
    type: clean(row.type) || (videoUrl(row) ? "video" : "text"),
    title: clean(row.title),
    text: clean(row.text || row.video?.transcript || ""),
    rating: typeof row.rating === "number" ? row.rating : Number(row.rating) || null,
    date: clean(row.date || row.created_at),
    tags: Array.isArray(row.tags) ? row.tags.map(clean).filter(Boolean) : [],
    name: clean(row.customer_name) || "Anonymous learner",
    avatar: clean(row.customer_avatar),
    role: clean(row.customer_tagline),
    company: clean(row.customer_company),
    hasVideo: Boolean(videoUrl(row)),
    videoUrl: videoUrl(row),
    course,
  };
}

function statsFor(reviews) {
  const ratings = reviews.map((r) => r.rating).filter((x) => typeof x === "number" && x > 0);
  return {
    totalReviews: reviews.length,
    textReviews: reviews.filter((r) => r.text && r.type !== "video").length,
    videoReviews: reviews.filter((r) => r.videoUrl).length,
    ratedReviews: ratings.length,
    averageRating: Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)),
    fiveStarReviews: ratings.filter((x) => x === 5).length,
  };
}

const all = await fetchAllTestimonials();
const hydrated = [];
for (const row of all) hydrated.push(await hydrateVideo(row));

const reviews = hydrated
  .filter((row) => !isExcluded(row))
  .map((row) => ({ raw: row, normalized: normalize(row) }))
  .filter(({ raw, normalized }) => hasConfidentAiMlSignal(raw, normalized.course))
  .filter(({ normalized }) => normalized.name !== "Anonymous learner" || normalized.text || normalized.videoUrl)
  .map(({ normalized }) => normalized)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

const payload = { stats: statsFor(reviews), reviews };
writeFileSync("reviews-data.js", `window.VIZUARA_REVIEW_DATA = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
console.log(`Synced ${reviews.length} public testimonials from Senja.`);
console.log(payload.stats);
