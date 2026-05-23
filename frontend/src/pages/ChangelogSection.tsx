import useChangelogData from "../hooks/useChangelogData";
import type { FetchEntry, ChangelogArtist, ChangelogTrack } from "../types";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function ArtistChip({ a }: { a: ChangelogArtist }) {
  return (
    <div className="cl-artist-chip">
      {a.image ? (
        <img className="cl-artist-img" src={a.image} alt={a.name} loading="lazy" />
      ) : (
        <div className="cl-artist-img cl-artist-img--placeholder" />
      )}
      <div className="cl-artist-info">
        <span className="cl-artist-name">{a.name}</span>
        {a.genres.length > 0 && (
          <div className="cl-genre-tags">
            {a.genres.slice(0, 3).map((g) => (
              <span key={g} className="cl-genre-tag">{g}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TrackRow({ t }: { t: ChangelogTrack }) {
  return (
    <div className="cl-track-row">
      {t.album_image ? (
        <img className="cl-track-thumb" src={t.album_image} alt={t.name} loading="lazy" />
      ) : (
        <div className="cl-track-thumb cl-track-thumb--placeholder" />
      )}
      <div className="cl-track-info">
        <span className="cl-track-name">{t.name}</span>
        <span className="cl-track-artist">{t.artist}</span>
      </div>
    </div>
  );
}

function FetchBlock({ entry }: { entry: FetchEntry }) {
  const hasArtists = entry.artists.length > 0;
  const hasTracks = entry.tracks.length > 0;
  const isEmpty = !hasArtists && !hasTracks;

  return (
    <div className="cl-fetch-block">
      <div className="cl-fetch-header">
        <span className="cl-fetch-date">{fmtDate(entry.fetched_at)}</span>
        <span className="cl-fetch-meta">
          {entry.new_artists > 0 && <span>+{entry.new_artists} artists</span>}
          {entry.new_tracks > 0 && <span>+{entry.new_tracks} tracks</span>}
          {entry.new_plays > 0 && <span>+{entry.new_plays} plays</span>}
          {entry.new_artists === 0 && entry.new_tracks === 0 && entry.new_plays === 0 && (
            <span className="cl-fetch-no-new">no new items</span>
          )}
        </span>
        {entry.snapshot_file && (
          <span className="cl-fetch-file">{entry.snapshot_file}</span>
        )}
      </div>

      {isEmpty && (
        <p className="cl-empty-note">
          All artists and tracks were already in the pool — nothing new this fetch.
        </p>
      )}

      {hasArtists && (
        <div className="cl-subsection">
          <div className="cl-subsection-label">new artists</div>
          <div className="cl-artist-grid">
            {entry.artists.map((a) => <ArtistChip key={a.id} a={a} />)}
          </div>
        </div>
      )}

      {hasTracks && (
        <div className="cl-subsection">
          <div className="cl-subsection-label">new tracks</div>
          <div className="cl-track-list">
            {entry.tracks.map((t) => <TrackRow key={t.id} t={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChangelogSection() {
  const entries = useChangelogData();

  return (
    <section id="section-changelog" className="section cl-section">
      <header className="section-head">
        <div className="section-eyebrow">dev view</div>
        <h2 className="section-title">Fetch Changelog</h2>
        <p className="section-sub">
          New artists and tracks added with each daily fetch. Accessible via{" "}
          <code>#changelog</code>.
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="cl-empty-note">
          No fetches logged yet. Run <code>generate_data.py</code> to start tracking.
        </p>
      ) : (
        <div className="cl-feed">
          {entries.map((e) => <FetchBlock key={e.id} entry={e} />)}
        </div>
      )}
    </section>
  );
}
