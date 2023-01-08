import {
  FetchPlaylistTracksReponse,
  GetPlaylistReponse,
  GetPlaylistTracksResponse,
  MappedTrackItem,
  Playlist,
  TrackItem,
} from './types.js';

export const spotifyPlaylistColumnNames: {
  [P in keyof MappedTrackItem]: any;
} = {
  id: 1,
  name: 1,
  artists: 1,
  album: 1,
  uri: 1,
  duration: 1,
  explicit: 1,
  popularity: 1,
  preview_url: 1,
  album_cover: 1,
  added_at: 1,
};

const spotifyTrackMapper = (item: TrackItem): MappedTrackItem => {
  return {
    id: item.track.id || '',
    name: item.track.name,
    artists: item.track.artists.map((artist) => artist.name).join(', '),
    album: item.track.album.name,
    uri: item.track.uri || '',
    duration: item.track.duration_ms,
    explicit: item.track.explicit,
    popularity: item.track.popularity,
    preview_url: item.track.preview_url || '',
    album_cover: item.track.album.images.length
      ? item.track.album.images[0].url
      : '',
    added_at: item.added_at,
    // is_local: item.track.is_local,
  };
};

const spotifyPlaylistMapper = (playlist: Playlist) => ({
  id: playlist.id,
  name: playlist.name,
  owner: playlist.owner.id,
  numOfTracks: playlist.tracks.total,
  description: playlist.description,
  uri: playlist.uri,
  images: playlist.images.map((image) => image.url).join('|'),
});

export const getPlaylist = (spotifyApi, id: string): Promise<GetPlaylistReponse> => spotifyApi.getPlaylist(id);

export const getPlaylistIDs = async (
  spotifyApi,
  limit = 50,
  offset = 0,
): Promise<string[]> => {
  const {
    body: { items, next },
  } = await spotifyApi.getUserPlaylists({ limit, offset });
  const ids = [...(items as Array<Playlist>)].map((p) => p.id);
  if (next) {
    return [
      ...ids,
      ...(await getPlaylistIDs(spotifyApi, limit, offset + limit)),
    ];
  } else return ids;
};

export const fetchPlaylistTracks = async (
  spotifyApi,
  playlistId,
  offset = 0,
): Promise<FetchPlaylistTracksReponse> => {
  const {
    body: { items, next },
  }: GetPlaylistTracksResponse = await spotifyApi.getPlaylistTracks(
    playlistId,
    { limit: 100, offset },
  );

  const result = {
    tracks: [],
    lastQueried: '',
  } as FetchPlaylistTracksReponse;

  result.tracks.push(...items.map(spotifyTrackMapper));
  const lastModel = result.tracks[result.tracks.length - 1] || null;
  if (lastModel && lastModel.id) {
    result.lastQueried = lastModel.id;
  }
  return result;
};
