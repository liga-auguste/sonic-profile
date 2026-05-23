"""Tests for generate_data.py — pure functions only (no DB, no file I/O)."""

import sys
import types
from unittest.mock import MagicMock

# Mock sonic_db before importing generate_data so no DB connection is needed
_mock_sonic_db = types.ModuleType("sonic_db")
for _name in [
    "get_connection", "init_db", "upsert_artists", "upsert_tracks",
    "get_hours_chart", "count_artists", "count_tracks", "log_fetch", "get_changelog",
]:
    setattr(_mock_sonic_db, _name, MagicMock())
sys.modules.setdefault("sonic_db", _mock_sonic_db)

import pytest
from generate_data import (
    fmt_ms,
    pick_image,
    transform_track,
    transform_artist,
    transform_tracks_range,
    transform_artists_range,
    compute_stats,
    compute_venn,
    compute_genre_dna,
    compute_artist_universe,
)


# ── helpers ───────────────────────────────────────────────────────────────────

def make_track(
    id="t1", name="Song", artists=None, album="Album",
    duration_ms=180_000, explicit=False, release_date="2023-01-01",
):
    return {
        "id": id,
        "name": name,
        "artists": artists or [{"name": "Artist A"}],
        "album": {
            "name": album,
            "images": [{"url": f"http://img/{album}", "height": 300}],
            "release_date": release_date,
        },
        "duration_ms": duration_ms,
        "explicit": explicit,
        "external_urls": {"spotify": f"https://open.spotify.com/track/{id}"},
    }


def make_artist(id="a1", name="Artist A", genres=None, followers=1000, rank=1):
    return {
        "rank": rank,
        "id": id,
        "name": name,
        "image": f"http://img/{id}",
        "genres": genres or [],
        "followers": followers,
        "url": f"https://open.spotify.com/artist/{id}",
    }


# ── fmt_ms ────────────────────────────────────────────────────────────────────

def test_fmt_ms_typical():
    assert fmt_ms(197_142) == "3:17"

def test_fmt_ms_zero():
    assert fmt_ms(0) == "0:00"

def test_fmt_ms_exact_minute():
    assert fmt_ms(60_000) == "1:00"

def test_fmt_ms_over_hour():
    assert fmt_ms(3_661_000) == "61:01"

def test_fmt_ms_single_digit_seconds():
    assert fmt_ms(65_000) == "1:05"


# ── pick_image ────────────────────────────────────────────────────────────────

def test_pick_image_empty():
    assert pick_image([]) == ""

def test_pick_image_preferred_height():
    images = [
        {"url": "small.jpg", "height": 64},
        {"url": "medium.jpg", "height": 300},
        {"url": "large.jpg", "height": 640},
    ]
    assert pick_image(images, preferred_height=300) == "medium.jpg"

def test_pick_image_fallback_to_first():
    images = [{"url": "only.jpg", "height": 64}]
    assert pick_image(images, preferred_height=300) == "only.jpg"

def test_pick_image_no_height_field():
    images = [{"url": "noh.jpg"}]
    assert pick_image(images) == "noh.jpg"


# ── transform_track ───────────────────────────────────────────────────────────

def test_transform_track_shape():
    raw = make_track(id="abc", name="Test Song", artists=[{"name": "X"}, {"name": "Y"}])
    result = transform_track(raw, rank=3)
    assert result["rank"] == 3
    assert result["id"] == "abc"
    assert result["name"] == "Test Song"
    assert result["artists"] == ["X", "Y"]
    assert result["artist"] == "X, Y"
    assert result["duration_ms"] == 180_000
    assert result["explicit"] is False
    assert result["release_date"] == "2023-01-01"

def test_transform_track_explicit():
    raw = make_track(explicit=True)
    assert transform_track(raw, 1)["explicit"] is True

def test_transform_tracks_range_ranks():
    raw = {"items": [make_track(id=f"t{i}") for i in range(3)]}
    tracks = transform_tracks_range(raw)
    assert [t["rank"] for t in tracks] == [1, 2, 3]

def test_transform_tracks_range_empty():
    assert transform_tracks_range({}) == []


# ── transform_artist ──────────────────────────────────────────────────────────

def test_transform_artist_shape():
    raw = {
        "id": "a1", "name": "Jazz Artist",
        "images": [{"url": "img.jpg", "height": 300}],
        "genres": ["jazz", "soul"],
        "followers": {"total": 50_000},
        "external_urls": {"spotify": "https://open.spotify.com/artist/a1"},
    }
    result = transform_artist(raw, rank=2)
    assert result["rank"] == 2
    assert result["name"] == "Jazz Artist"
    assert result["genres"] == ["jazz", "soul"]
    assert result["followers"] == 50_000

def test_transform_artists_range_ranks():
    raw = {
        "items": [
            {"id": f"a{i}", "name": f"A{i}", "images": [], "genres": [],
             "followers": {"total": 0},
             "external_urls": {"spotify": ""}}
            for i in range(3)
        ]
    }
    artists = transform_artists_range(raw)
    assert [a["rank"] for a in artists] == [1, 2, 3]


# ── compute_stats ─────────────────────────────────────────────────────────────

def _make_track_transformed(id, name="Song", duration_ms=120_000, explicit=False,
                             release_date="2020-01-01", artist="Artist A"):
    return {
        "id": id, "name": name, "artist": artist,
        "artists": [artist],
        "album": "Album", "album_image": "",
        "duration_ms": duration_ms, "explicit": explicit,
        "release_date": release_date, "url": "",
    }


def test_compute_stats_deduplicates_across_ranges():
    t1 = _make_track_transformed("t1")
    t2 = _make_track_transformed("t2")
    # t1 appears in two ranges — should be counted once
    stats = compute_stats([[t1, t2], [t1], []], [[], [], []], "2024-01-01")
    assert stats["uniqueTracks"] == 2

def test_compute_stats_explicit_count():
    tracks = [
        _make_track_transformed("t1", explicit=True),
        _make_track_transformed("t2", explicit=False),
        _make_track_transformed("t3", explicit=True),
    ]
    stats = compute_stats([tracks, [], []], [[], [], []], "")
    assert stats["explicitCount"] == 2

def test_compute_stats_avg_track_length():
    t1 = _make_track_transformed("t1", duration_ms=120_000)  # 2:00
    t2 = _make_track_transformed("t2", duration_ms=180_000)  # 3:00
    stats = compute_stats([[t1, t2], [], []], [[], [], []], "")
    assert stats["avgTrackLength"] == "2:30"

def test_compute_stats_longest_track():
    short = _make_track_transformed("t1", name="Short", duration_ms=60_000)
    long  = _make_track_transformed("t2", name="Long",  duration_ms=300_000)
    stats = compute_stats([[short, long], [], []], [[], [], []], "")
    assert stats["longestTrackName"] == "Long"
    assert stats["longestTrack"] == "5:00"

def test_compute_stats_newest_release():
    older  = _make_track_transformed("t1", name="Old",    release_date="2019-01-01")
    newer  = _make_track_transformed("t2", name="New",    release_date="2024-06-15",
                                      artist="Band X")
    stats = compute_stats([[older, newer], [], []], [[], [], []], "")
    assert "New" in stats["newestRelease"]
    assert "Band X" in stats["newestRelease"]

def test_compute_stats_release_year_peak():
    tracks = [
        _make_track_transformed("t1", release_date="2020-01-01"),
        _make_track_transformed("t2", release_date="2020-05-01"),
        _make_track_transformed("t3", release_date="2021-01-01"),
    ]
    stats = compute_stats([tracks, [], []], [[], [], []], "")
    assert stats["releaseYearPeak"] == 2020
    assert stats["releaseYearOldest"] == 2020
    assert stats["releaseYearNewest"] == 2021

def test_compute_stats_year_only_date():
    t = _make_track_transformed("t1", release_date="2017")
    stats = compute_stats([[t], [], []], [[], [], []], "")
    assert stats["releaseYearOldest"] == 2017

def test_compute_stats_oldest_obsession():
    top_long = make_artist(id="a1", name="Timeless Band", rank=1)
    stats = compute_stats([[], [], []], [[], [], [top_long]], "")
    assert stats["oldestObsession"] == "Timeless Band"

def test_compute_stats_unique_artists():
    a1 = make_artist(id="a1", name="A1")
    a2 = make_artist(id="a2", name="A2")
    # a1 appears in short + long → counted once
    stats = compute_stats([[], [], []], [[a1, a2], [], [a1]], "")
    assert stats["uniqueArtists"] == 2


# ── compute_venn ──────────────────────────────────────────────────────────────

def _names(*names):
    return [make_artist(id=n, name=n) for n in names]


def test_venn_exclusive_regions():
    short  = _names("A", "B")
    medium = _names("C", "B")
    long_  = _names("D")
    v = compute_venn(short, medium, long_)
    assert "A" in v["S_only"]
    assert "C" in v["M_only"]
    assert "D" in v["L_only"]
    assert "B" in v["SM"]

def test_venn_all_intersection():
    artists = _names("X")
    v = compute_venn(artists, artists, artists)
    assert "X" in v["ALL"]

def test_venn_sl_intersection():
    a = _names("Z")
    v = compute_venn(a, [], a)
    assert "Z" in v["SL"]
    assert "Z" not in v["ALL"]

def test_venn_counts_match_lists():
    short  = _names("A", "B", "C")
    medium = _names("B", "D")
    long_  = _names("C", "D", "E")
    v = compute_venn(short, medium, long_)
    for key, lst in v.items():
        if key == "counts":
            continue
        assert v["counts"][key] == len(lst)

def test_venn_empty():
    v = compute_venn([], [], [])
    assert all(v[k] == [] for k in ["S_only", "M_only", "L_only", "SM", "SL", "ML", "ALL"])


# ── compute_genre_dna ─────────────────────────────────────────────────────────

def test_genre_dna_single_bucket():
    a = make_artist(id="a1", name="Soulful One", genres=["neo-soul"], rank=1)
    result = compute_genre_dna([a], [], [])
    assert len(result) == 1
    assert result[0]["name"] == "soul / R&B"
    assert result[0]["share"] == 100.0
    assert "Soulful One" in result[0]["artists"]

def test_genre_dna_first_match_wins():
    # "acoustic" hits "indie / folk", not "electronic" — even if "electronic" is later
    a = make_artist(id="a1", name="Folky", genres=["acoustic", "electronic"], rank=1)
    result = compute_genre_dna([a], [], [])
    assert result[0]["name"] == "indie / folk"

def test_genre_dna_multiple_buckets():
    jazz_artist  = make_artist(id="a1", name="Jazz Guy",   genres=["jazz"],      rank=1)
    soul_artist  = make_artist(id="a2", name="Soul Lady",  genres=["soul"],      rank=2)
    result = compute_genre_dna([jazz_artist, soul_artist], [], [])
    names = [r["name"] for r in result]
    assert "jazz" in names
    assert "soul / R&B" in names

def test_genre_dna_unknown_genre_excluded():
    a = make_artist(id="a1", name="Mystery", genres=["zydeco"], rank=1)
    result = compute_genre_dna([a], [], [])
    assert result == []

def test_genre_dna_empty():
    assert compute_genre_dna([], [], []) == []

def test_genre_dna_shares_sum_to_100():
    artists = [
        make_artist(id="a1", name="Classical", genres=["classical"], rank=1),
        make_artist(id="a2", name="Rapper",    genres=["hip-hop"],   rank=2),
        make_artist(id="a3", name="Jazzman",   genres=["jazz"],      rank=3),
    ]
    result = compute_genre_dna(artists, [], [])
    total = sum(r["share"] for r in result)
    assert abs(total - 100.0) < 0.5

def test_genre_dna_rank_weights_correctly():
    # rank 1 artist should contribute more than rank 50 artist in same bucket
    top    = make_artist(id="a1", name="Top",    genres=["soul"], rank=1)
    bottom = make_artist(id="a2", name="Bottom", genres=["soul"], rank=50)
    result = compute_genre_dna([top, bottom], [], [])
    # Both in same bucket → share is 100, top artist listed first
    assert result[0]["artists"][0] == "Top"

def test_genre_dna_deduplicates_artists_across_ranges():
    a = make_artist(id="a1", name="A", genres=["jazz"], rank=1)
    # same artist in short and medium — should be one entry with 2 ranks
    result = compute_genre_dna([a], [a], [])
    assert len(result) == 1
    assert result[0]["share"] == 100.0

def test_genre_dna_range_count_boosts_weight():
    # artist in all 3 ranges gets 3x the weight of one in a single range (same rank).
    # Put both in the same bucket and compare shares: 3x weight → 75% vs 25%.
    single = make_artist(id="a1", name="SingleRange", genres=["jazz"], rank=5)
    triple = make_artist(id="a2", name="TripleRange", genres=["jazz"], rank=5)
    result = compute_genre_dna([single, triple], [triple], [triple])
    bucket = result[0]
    assert bucket["name"] == "jazz"
    # TripleRange listed first (higher weight) and gets ~75% of total weight
    assert bucket["artists"][0] == "TripleRange"


# ── compute_artist_universe ───────────────────────────────────────────────────

def _make_track_with_artist(name):
    return {
        "id": name, "name": f"Song by {name}",
        "artists": [name],
        "album": "Alb", "album_image": "", "duration_ms": 180_000,
        "explicit": False, "release_date": "2020", "url": "", "artist": name,
        "rank": 1,
    }


def test_artist_universe_excludes_single_appearance():
    t = _make_track_with_artist("Rare Artist")
    result = compute_artist_universe([t], [], [], [], [], [])
    assert not any(a["name"] == "Rare Artist" for a in result)

def test_artist_universe_era_long_time_favorite():
    a = make_artist(id="a1", name="Veteran")
    result = compute_artist_universe([], [], [], [], [], [a])
    # artist in long artist list → long-time favorite
    entry = next((x for x in result if x["name"] == "Veteran"), None)
    # only 1 appearance (la) → filtered; add another appearance
    t = _make_track_with_artist("Veteran")
    result = compute_artist_universe([], [], [t], [], [], [a])
    entry = next((x for x in result if x["name"] == "Veteran"), None)
    assert entry is not None
    assert entry["era"] == "long-time favorite"
    assert entry["hue"] == 185

def test_artist_universe_era_recent_obsession():
    t_short = _make_track_with_artist("Newcomer")
    t_med   = _make_track_with_artist("Newcomer")
    result = compute_artist_universe([t_short], [t_med], [], [], [], [])
    entry = next((x for x in result if x["name"] == "Newcomer"), None)
    assert entry is not None
    assert entry["era"] == "recent obsession"
    assert entry["hue"] == 340

def test_artist_universe_max_bubbles():
    artists = [make_artist(id=f"a{i}", name=f"Artist{i}") for i in range(30)]
    # put each artist in two artist ranges to pass the total>=2 filter
    result = compute_artist_universe([], [], [], artists, artists, [], max_bubbles=10)
    assert len(result) <= 10

def test_artist_universe_size_bounds():
    a = make_artist(id="a1", name="Big Star")
    t = _make_track_with_artist("Big Star")
    result = compute_artist_universe([t], [t], [t], [a], [a], [a])
    entry = next((x for x in result if x["name"] == "Big Star"), None)
    assert entry is not None
    assert 4 <= entry["size"] <= 15

def test_artist_universe_coordinates_in_bounds():
    a = make_artist(id="a1", name="Steady")
    t = _make_track_with_artist("Steady")
    result = compute_artist_universe([t], [], [], [a], [a], [a])
    entry = next((x for x in result if x["name"] == "Steady"), None)
    assert entry is not None
    assert 0.0 <= entry["x"] <= 1.0
    assert 0.0 <= entry["y"] <= 1.0
