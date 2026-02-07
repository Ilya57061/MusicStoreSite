import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { coverUrl, exportUrl, fetchLocales, fetchSongDetails, fetchSongs, previewUrl } from "./api.js";
import { randomSeed64, useDebouncedValue, useInfiniteScroll } from "./hooks.js";

const DEFAULT_PAGE_SIZE = 20;

export default function App() {
  const [locales, setLocales] = useState([]);
  const [mode, setMode] = useState("table");

  const [locale, setLocale] = useState("en-US");
  const [seedInput, setSeedInput] = useState("1");
  const [likesInput, setLikesInput] = useState("3.7");

  const seed = useDebouncedValue(seedInput, 250);
  const likesAverage = useDebouncedValue(likesInput, 250);

  const [page, setPage] = useState(1);
  const [tableItems, setTableItems] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [detailsCache, setDetailsCache] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryHasMore, setGalleryHasMore] = useState(true);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState("");

  const likesNum = useMemo(() => {
    const x = Number(likesAverage);
    if (Number.isNaN(x)) return 0;
    return Math.max(0, Math.min(10, x));
  }, [likesAverage]);

  const seedNum = useMemo(() => {
    try {
      const s = seed.trim();
      if (!s) return "1";
      if (s.startsWith("-")) return "1";
      return s.replace(/[^0-9]/g, "").slice(0, 20) || "1";
    } catch {
      return "1";
    }
  }, [seed]);

  useEffect(() => {
    fetchLocales()
      .then((x) => {
        setLocales(x);
        if (x?.length && !x.some((l) => l.locale === "en-US")) {
          setLocale(x[0].locale);
        }
      })
      .catch(() => setLocales([{ locale: "en-US", displayName: "English (United States)" }]));
  }, []);

  useEffect(() => {
    setPage(1);
    setExpanded(null);
    setDetailsCache(new Map());
    setGalleryItems([]);
    setGalleryPage(1);
    setGalleryHasMore(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [locale, seedNum, likesNum]);

  const loadTable = useCallback(async (p) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSongs({
        locale,
        seed: seedNum,
        likesAverage: likesNum,
        page: p,
        pageSize: DEFAULT_PAGE_SIZE,
      });
      setTableItems(data.items || []);
    } catch (e) {
      setError(e?.message || "Failed to load");
      setTableItems([]);
    } finally {
      setLoading(false);
    }
  }, [locale, seedNum, likesNum]);

  useEffect(() => {
    if (mode !== "table") return;
    loadTable(page);
  }, [mode, page, loadTable]);

  const toggleExpand = useCallback(async (row) => {
    const id = row.sequenceIndex;
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);

    if (detailsCache.has(id)) return;

    try {
      const d = await fetchSongDetails({
        locale,
        seed: seedNum,
        likesAverage: likesNum,
        page,
        sequenceIndex: id,
      });
      setDetailsCache((m) => new Map(m).set(id, d));
    } catch {
    }
  }, [expanded, detailsCache, locale, seedNum, likesNum, page]);

  const loadMoreGallery = useCallback(async () => {
    if (!galleryHasMore || galleryLoading) return;
    setGalleryLoading(true);
    setGalleryError("");
    try {
      const data = await fetchSongs({
        locale,
        seed: seedNum,
        likesAverage: likesNum,
        page: galleryPage,
        pageSize: DEFAULT_PAGE_SIZE,
      });

      const items = data.items || [];
      setGalleryItems((prev) => [...prev, ...items]);
      setGalleryPage((p) => p + 1);
      if (items.length < DEFAULT_PAGE_SIZE) setGalleryHasMore(false);
    } catch (e) {
      setGalleryError(e?.message || "Failed to load");
      setGalleryHasMore(false);
    } finally {
      setGalleryLoading(false);
    }
  }, [galleryHasMore, galleryLoading, locale, seedNum, likesNum, galleryPage]);

  useEffect(() => {
    if (mode !== "gallery") return;
    if (galleryItems.length === 0 && galleryHasMore && !galleryLoading) {
      loadMoreGallery();
    }
  }, [mode, galleryItems.length, galleryHasMore, galleryLoading, loadMoreGallery]);

  const sentinelRef = useInfiniteScroll({
    hasMore: galleryHasMore,
    loading: galleryLoading,
    onLoadMore: loadMoreGallery,
  });

  const onRandomSeed = () => setSeedInput(randomSeed64());

  const onExport = () => {
    const url = exportUrl({
      locale,
      seed: seedNum,
      likesAverage: likesNum,
      page: mode === "table" ? page : Math.max(1, galleryPage - 1),
      pageSize: DEFAULT_PAGE_SIZE,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Music Store</h1>
        <button className="btn btn-outline-secondary btn-sm" onClick={onExport}>
          Export ZIP (current page)
        </button>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label">Language / Region</label>
              <select className="form-select" value={locale} onChange={(e) => setLocale(e.target.value)}>
                {locales.map((l) => (
                  <option key={l.locale} value={l.locale}>{l.displayName}</option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">64-bit Seed</label>
              <input
                className="form-control"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="e.g., 123456789"
                inputMode="numeric"
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">&nbsp;</label>
              <button className="btn btn-outline-primary w-100" onClick={onRandomSeed}>
                Random seed
              </button>
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">Likes (avg 0–10)</label>
              <input
                className="form-control"
                value={likesInput}
                onChange={(e) => setLikesInput(e.target.value)}
                placeholder="e.g., 3.7"
                inputMode="decimal"
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">View</label>
              <div className="btn-group w-100" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`btn ${mode === "table" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setMode("table")}
                >
                  Table
                </button>
                <button
                  type="button"
                  className={`btn ${mode === "gallery" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setMode("gallery")}
                >
                  Gallery
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {mode === "table" ? (
        <>
          {error ? <div className="alert alert-danger">{error}</div> : null}

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 70 }}>#</th>
                  <th>Title</th>
                  <th>Artist</th>
                  <th>Album</th>
                  <th>Genre</th>
                  <th style={{ width: 90 }}>Likes</th>
                </tr>
              </thead>
              <tbody>
                {tableItems.map((row) => (
                  <React.Fragment key={row.sequenceIndex}>
                    <tr>
                      <td>{row.sequenceIndex}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none"
                          onClick={() => toggleExpand(row)}
                        >
                          {row.title}
                        </button>
                      </td>
                      <td>{row.artist}</td>
                      <td>{row.album}</td>
                      <td>{row.genre}</td>
                      <td>{row.likes}</td>
                    </tr>
                    {expanded === row.sequenceIndex ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="border rounded p-3 bg-light">
                            <SongDetailsPanel
                              cached={detailsCache.get(row.sequenceIndex)}
                              locale={locale}
                              seed={seedNum}
                              likesAverage={likesNum}
                              page={page}
                              sequenceIndex={row.sequenceIndex}
                            />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))}

                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">Loading…</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Prev
            </button>
            <div className="text-muted">Page {page}</div>
            <button
              className="btn btn-outline-secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <>
          {galleryError ? <div className="alert alert-danger">{galleryError}</div> : null}

          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
            {galleryItems.map((row) => {
              const itemPage = Math.ceil(row.sequenceIndex / DEFAULT_PAGE_SIZE);
              return (
                <div key={row.sequenceIndex} className="col">
                  <div className="card h-100">
                    <div className="card-body">
                      <div className="d-flex gap-3">
                        <img
                          className="rounded border cover-sm"
                          alt="cover"
                          src={coverUrl({ locale, seed: seedNum, page: itemPage, sequenceIndex: row.sequenceIndex })}
                          loading="lazy"
                        />
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{row.title}</div>
                          <div className="text-muted small">{row.artist}</div>
                          <div className="text-muted small">{row.album} · {row.genre}</div>
                          <div className="text-muted small">Likes: {row.likes}</div>
                        </div>
                      </div>
                      <audio
                        className="audio-full mt-2"
                        controls
                        preload="none"
                        src={previewUrl({ locale, seed: seedNum, page: itemPage, sequenceIndex: row.sequenceIndex })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div ref={sentinelRef} className="text-center text-muted py-4">
            {galleryLoading ? "Loading more…" : (galleryHasMore ? "Scroll to load more" : "End")}
          </div>
        </>
      )}
    </div>
  );
}

function SongDetailsPanel({ cached, locale, seed, likesAverage, page, sequenceIndex }) {
  const details = cached;

  const cover = coverUrl({ locale, seed, page, sequenceIndex });
  const audio = previewUrl({ locale, seed, page, sequenceIndex });

  return (
    <div className="row g-3 align-items-start">
      <div className="col-auto">
        <img className="rounded border cover-lg" alt="cover" src={cover} />
      </div>
      <div className="col">
        {details ? (
          <>
            <div className="text-muted small">{details.genre} · Likes: {details.likes}</div>
            <div className="mt-2">{details.review}</div>
          </>
        ) : (
          <div className="text-muted">Loading details…</div>
        )}
        <audio className="audio-full mt-3" controls src={audio} />
      </div>
    </div>
  );
}
