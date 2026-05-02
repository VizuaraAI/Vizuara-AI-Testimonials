let dataset = window.VIZUARA_REVIEW_DATA || { stats: {}, reviews: [] };
let allReviews = dataset.reviews;
let writtenReviews = allReviews.filter((review) => review.text || review.title);
let videoReviews = allReviews.filter((review) => review.videoUrl);

const themeDefinitions = [
  {
    label: "Research",
    terms: ["research", "paper", "publication", "researcher"],
    note: "Learners mention papers, independent research, publications, and research-grade depth.",
  },
  {
    label: "LLMs",
    terms: ["llm", "large language model", "token", "genai"],
    note: "Reviews include LLM fundamentals, token prediction, context engineering, and GenAI systems.",
  },
  {
    label: "RAG",
    terms: ["rag", "chunking", "embedding", "vector"],
    note: "Production RAG, chunking, embeddings, vector databases, and deployment show up often.",
  },
  {
    label: "Practical",
    terms: ["practical", "coding", "assignment", "hands on", "hands-on"],
    note: "Learners consistently value coding, assignments, live demos, and usable engineering trade-offs.",
  },
  {
    label: "Agents",
    terms: ["agent", "agentic", "tool calling", "autonomous"],
    note: "Agentic AI, tools, memory, frameworks, and production agent design are recurring themes.",
  },
  {
    label: "Confidence",
    terms: ["confidence", "confident", "self-assurance"],
    note: "Several reviews describe gaining confidence to enter a new domain or build independently.",
  },
  {
    label: "Hands-on",
    terms: ["hands on", "hands-on", "implemented", "lab"],
    note: "Hands-on work appears across robotics, GPU systems, RAG, coding agents, and vision.",
  },
  {
    label: "Robotics",
    terms: ["robot", "robotics", "physical ai", "autonomy"],
    note: "Robot learning, SO-101 arms, Physical AI, autonomy, and field robotics appear in reviews.",
  },
];

const themeBoard = document.querySelector("#themeBoard");
const reviewGrid = document.querySelector("#reviewGrid");
const videoGallery = document.querySelector("#videoGallery");
const filterButtons = document.querySelectorAll("[data-filter]");

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function stars(rating) {
  if (!rating || rating <= 0) return "Rating not provided";
  return "★★★★★".slice(0, Math.round(rating));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function impactTags(review) {
  const haystack = `${review.title} ${review.text} ${review.course}`.toLowerCase();
  const tags = [];
  if (/(clarity|clear|simple|understand|intuition|first principle|visual)/.test(haystack)) tags.push("clarity");
  if (/(hands on|hands-on|coding|assignment|implemented|lab|practical)/.test(haystack)) tags.push("hands-on");
  if (/(research|paper|publication|scientist|phd|arxiv)/.test(haystack)) tags.push("research");
  if (/(production|deploy|system|scale|gpu|pipeline|industry|real-world|real world)/.test(haystack)) tags.push("production");
  return [...new Set(tags)];
}

function reviewContent(review) {
  if (review.text) return review.text;
  if (review.title) return review.title;
  if (review.hasVideo) return "";
  return "Review entry included in the CSV export. No written testimonial text was provided in this row.";
}

function truncate(text, max = 620) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function reviewBody(review) {
  const content = reviewContent(review);
  if (!content) return "";
  if (content.length <= 620) return `<p>${escapeHtml(content)}</p>`;
  return `
    <p>${escapeHtml(truncate(content))}</p>
    <details class="full-review">
      <summary>Read full review</summary>
      <p>${escapeHtml(content)}</p>
    </details>
  `;
}

function reviewVideo(review) {
  if (!review.videoUrl) return "";
  return `
    <div class="video-wrap">
      <video controls preload="metadata" playsinline>
        <source src="${escapeHtml(review.videoUrl)}" type="video/mp4" />
        Your browser does not support this video testimonial.
      </video>
    </div>
  `;
}

function updateStats() {
  const stats = dataset.stats || {};
  document.querySelector("#totalReviews").textContent = stats.totalReviews ?? allReviews.length;
  document.querySelector("#averageRating").textContent = (stats.averageRating ?? 0).toFixed
    ? stats.averageRating.toFixed(2)
    : stats.averageRating;
  document.querySelector("#fiveStarReviews").textContent = stats.fiveStarReviews ?? "";
  document.querySelector("#videoReviews").textContent = stats.videoReviews ?? "";
}

function setDataset(nextDataset) {
  dataset = nextDataset || { stats: {}, reviews: [] };
  allReviews = dataset.reviews || [];
  writtenReviews = allReviews.filter((review) => review.text || review.title);
  videoReviews = allReviews.filter((review) => review.videoUrl);
}

async function loadLiveDataset() {
  try {
    const response = await fetch("/api/reviews", { cache: "no-store" });
    if (!response.ok) return;
    const liveDataset = await response.json();
    if (Array.isArray(liveDataset.reviews)) setDataset(liveDataset);
  } catch {
    // Keep the generated reviews-data.js fallback for local previews or API errors.
  }
}

function renderThemes() {
  const themes = themeDefinitions.map((theme) => ({
    ...theme,
    count: allReviews.filter((review) =>
      theme.terms.some((term) => `${review.title} ${review.text} ${review.course}`.toLowerCase().includes(term)),
    ).length,
  }));
  const max = Math.max(...themes.map((theme) => theme.count), 1);
  themeBoard.innerHTML = themes
    .map(
      (theme) => `
        <article class="theme-card">
          <header>
            <h3>${escapeHtml(theme.label)}</h3>
            <strong>${theme.count}</strong>
          </header>
          <div class="meter" aria-hidden="true"><span style="width:${(theme.count / max) * 100}%"></span></div>
          <p>${escapeHtml(theme.note)}</p>
        </article>
      `,
    )
    .join("");
}

function renderReviews(filter = "all") {
  const visible =
    filter === "all"
      ? writtenReviews
      : writtenReviews.filter((review) => impactTags(review).includes(filter));

  reviewGrid.innerHTML = visible
    .map((review) => {
      const meta = [review.role, review.company].filter(Boolean).join(" · ");
      const avatar = review.avatar
        ? `<img src="${escapeHtml(review.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
        : escapeHtml(initials(review.name));
      const tags = impactTags(review);
      const ratingLabel = review.rating && review.rating > 0 ? `${review.rating} out of 5 stars` : "Rating not provided";
      return `
        <article class="review-card ${review.hasVideo && !review.text ? "video-only" : ""}">
          <div>
            <div class="card-head">
              <span class="course-pill">${escapeHtml(review.course)}</span>
              <span class="stars" aria-label="${escapeHtml(ratingLabel)}">${escapeHtml(stars(review.rating))}</span>
            </div>
            ${review.title ? `<h3 class="review-title">${escapeHtml(review.title)}</h3>` : ""}
            ${reviewVideo(review)}
            ${reviewBody(review)}
            <div class="tag-row">
              ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
          <footer class="review-person">
            <span class="avatar">${avatar}</span>
            <span>
              <span class="person-name">${escapeHtml(review.name)}</span>
              <span class="person-meta">${escapeHtml(meta || `Review #${review.id}`)}</span>
            </span>
          </footer>
        </article>
      `;
    })
    .join("");
}

function renderVideoGallery() {
  videoGallery.innerHTML = videoReviews
    .map((review) => {
      const meta = [review.role, review.company].filter(Boolean).join(" · ");
      const avatar = review.avatar
        ? `<img src="${escapeHtml(review.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
        : escapeHtml(initials(review.name));
      const ratingLabel = review.rating && review.rating > 0 ? `${review.rating} out of 5 stars` : "Rating not provided";
      return `
        <article class="video-card">
          <div class="card-head">
            <span class="course-pill">${escapeHtml(review.course)}</span>
            <span class="stars" aria-label="${escapeHtml(ratingLabel)}">${escapeHtml(stars(review.rating))}</span>
          </div>
          ${reviewVideo(review)}
          <footer class="review-person">
            <span class="avatar">${avatar}</span>
            <span>
              <span class="person-name">${escapeHtml(review.name)}</span>
              <span class="person-meta">${escapeHtml(meta || `Video review #${review.id}`)}</span>
            </span>
          </footer>
        </article>
      `;
    })
    .join("");
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderReviews(button.dataset.filter);
  });
});

async function init() {
  await loadLiveDataset();
  updateStats();
  renderThemes();
  renderVideoGallery();
  renderReviews();
}

init();
