"""Understanding a video link.

Staff paste links; they should never have to know what an embed URL is. This
module turns whatever was pasted into something the classroom screen can show,
and says honestly when it cannot.

Rules that exist for the children's benefit, not for convenience:

* YouTube is always rewritten to ``youtube-nocookie.com`` with ``rel=0`` and
  ``modestbranding=1``, so a classroom screen never shows recommended videos,
  channel branding or a trail off into unrelated content when a clip ends.
* Anything that cannot be embedded cleanly is marked as such and opened in a new
  tab instead of being crammed into an iframe that will fail silently.
"""
from __future__ import annotations

import re
from urllib.parse import parse_qs, urlparse

YOUTUBE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
YOUTUBE_LIST = re.compile(r"^[A-Za-z0-9_-]{12,60}$")
YOUTUBE_HOSTS = {"youtube.com", "m.youtube.com", "youtube-nocookie.com", "music.youtube.com"}

# Common player flags. No related videos, no branding, inline on tablets.
_YT_FLAGS = "rel=0&modestbranding=1&playsinline=1&iv_load_policy=3"


def _youtube_video(video_id: str) -> dict:
    return {
        "provider": "youtube",
        "kind": "video",
        "ref": video_id,
        "embed_url": f"https://www.youtube-nocookie.com/embed/{video_id}?{_YT_FLAGS}",
        "thumbnail_url": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        "watch_url": f"https://www.youtube.com/watch?v={video_id}",
        "can_embed": True,
    }


def _youtube_playlist(list_id: str) -> dict:
    return {
        "provider": "youtube",
        "kind": "playlist",
        "ref": list_id,
        "embed_url": f"https://www.youtube-nocookie.com/embed/videoseries?list={list_id}&{_YT_FLAGS}",
        "thumbnail_url": None,
        "watch_url": f"https://www.youtube.com/playlist?list={list_id}",
        "can_embed": True,
    }


def describe(url: str) -> dict:
    """Return what can be done with ``url``.

    Keys: ``provider``, ``kind`` (video/playlist/channel/link), ``embed_url``,
    ``thumbnail_url``, ``watch_url``, ``can_embed``.
    """
    blank = {
        "provider": "none",
        "kind": "link",
        "ref": None,
        "embed_url": None,
        "thumbnail_url": None,
        "watch_url": None,
        "can_embed": False,
    }
    if not url or not str(url).strip():
        return blank
    try:
        parsed = urlparse(str(url).strip())
    except ValueError:
        return {**blank, "provider": "unknown"}
    if parsed.scheme not in {"http", "https"}:
        return {**blank, "provider": "unknown"}

    host = (parsed.hostname or "").lower().removeprefix("www.")
    query = parse_qs(parsed.query)
    path_parts = [p for p in parsed.path.split("/") if p]

    # ---- YouTube ---------------------------------------------------------
    if host in YOUTUBE_HOSTS:
        video_id = (query.get("v") or [""])[0]
        list_id = (query.get("list") or [""])[0]
        if not video_id and path_parts and path_parts[0] in {"embed", "shorts", "live", "v"}:
            video_id = path_parts[1] if len(path_parts) > 1 else ""
        if video_id == "videoseries":
            video_id = ""
        if YOUTUBE_ID.match(video_id):
            described = _youtube_video(video_id)
            if YOUTUBE_LIST.match(list_id):
                described["playlist_ref"] = list_id
            return described
        if YOUTUBE_LIST.match(list_id):
            return _youtube_playlist(list_id)
        if path_parts and path_parts[0] == "playlist":
            return {**blank, "provider": "youtube", "kind": "link", "watch_url": url}
        # A channel: @handle, /channel/UC..., /c/Name, /user/Name
        if path_parts and (path_parts[0].startswith("@") or path_parts[0] in {"channel", "c", "user"}):
            channel_ref = path_parts[1] if path_parts[0] in {"channel", "c", "user"} and len(path_parts) > 1 else path_parts[0]
            described = {
                "provider": "youtube",
                "kind": "channel",
                "ref": channel_ref,
                "embed_url": None,
                "thumbnail_url": None,
                "watch_url": url,
                "can_embed": False,
            }
            # A channel id (UC...) has a matching uploads playlist (UU...), and
            # that *can* be embedded - which is how "the whole of Numberblocks"
            # becomes something a child can actually watch on the board.
            if channel_ref.startswith("UC") and len(channel_ref) == 24:
                uploads = "UU" + channel_ref[2:]
                described.update(_youtube_playlist(uploads))
                described["kind"] = "playlist"
            return described

    if host == "youtu.be" and path_parts and YOUTUBE_ID.match(path_parts[0]):
        return _youtube_video(path_parts[0])

    # ---- Vimeo -----------------------------------------------------------
    if host in {"vimeo.com", "player.vimeo.com"}:
        digits = [p for p in path_parts if p.isdigit()]
        if digits:
            return {
                "provider": "vimeo",
                "kind": "video",
                "ref": digits[0],
                "embed_url": f"https://player.vimeo.com/video/{digits[0]}",
                "thumbnail_url": None,
                "watch_url": f"https://vimeo.com/{digits[0]}",
                "can_embed": True,
            }

    # ---- BBC -------------------------------------------------------------
    # iPlayer and Bitesize cannot be embedded in a third-party page (and
    # iPlayer is sign-in and region restricted), so these are always opened in
    # a new tab. Saying so plainly is better than a blank black rectangle.
    if host.endswith("bbc.co.uk") or host.endswith("bbc.com") or host.endswith("bbc.in"):
        return {
            "provider": "bbc",
            "kind": "link",
            "ref": None,
            "embed_url": None,
            "thumbnail_url": None,
            "watch_url": url,
            "can_embed": False,
        }

    return {
        "provider": "link",
        "kind": "link",
        "ref": None,
        "embed_url": None,
        "thumbnail_url": None,
        "watch_url": url,
        "can_embed": False,
    }


def is_web_link(url: str) -> bool:
    return describe(url)["provider"] != "unknown"
