import SpotifyWebApi from 'spotify-web-api-node';
import { sheets_v4 } from 'googleapis';
import { FeaturesOfSpotifyExport } from '../../controllers/types.js';
import {
  fetchPlaylistTracks,
  getPlaylist,
  spotifyPlaylistColumnNames,
} from '../spotify/index.js';
import { ImportSpotifyDataIntoSheetResponse } from '../spotify/types.js';
import { INITIAL_SHEET_NAME } from '../constants.js';

const freezeRowRequest = (frozenRowCount = 1) => ({
  gridProperties: {
    frozenRowCount,
  },
});

export const getSpreadSheet = (sheetsApi: sheets_v4.Sheets, id: string) =>
  sheetsApi.spreadsheets.get({
    spreadsheetId: id,
  });

export const createSpreadSheet = (sheetsApi: sheets_v4.Sheets, title: string) =>
  sheetsApi.spreadsheets.create({
    requestBody: {
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: INITIAL_SHEET_NAME,
            ...freezeRowRequest(),
          },
        },
      ],
    },
  });

export const createNewSheet = (
  sheetsApi: sheets_v4.Sheets,
  title: string,
  spreadsheetId: string,
) =>
  sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title,
              ...freezeRowRequest(),
              // "tabColor": {
              //   "red": 1.0,
              //   "green": 0.3,
              //   "blue": 0.4
              // }
            },
          },
        },
      ],
    },
  });

export const renameSheet = (
  sheetsApi: sheets_v4.Sheets,
  title: string,
  spreadsheetId: string,
  sheetId: number,
) =>
  sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              title,
              sheetId,
            },
          },
        },
      ],
    },
  });

export const importRowsIntoSheet = async (
  sheetsApi: sheets_v4.Sheets,
  data: Array<Array<string | number | boolean>>,
  spreadsheetId: string,
  startingRowNum = 1,
  sheetName?: string,
) => {
  const range = sheetName
    ? `${sheetName}!A${startingRowNum}`
    : `A${startingRowNum}`;
  sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [...data],
    },
  });
};

export const sheetExists = async (
  sheetsApi: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
): Promise<boolean> => {
  const spreadsheet = await sheetsApi.spreadsheets.get({ spreadsheetId });
  const sheets = spreadsheet.data.sheets;
  for (const sheet of sheets) {
    if (sheet.properties.title === sheetName) return true;
  }
  return false;
};

// const getTextFormatRequest = (
//   fontColor,
//   startRowIndex,
//   endRowIndex,
//   startColumnIndex,
//   endColumnIndex,
//   isBold = true
// ) => ({
//   repeatCell: {
//     range: {
//       startRowIndex,
//       endRowIndex,
//       startColumnIndex,
//       endColumnIndex,
//     },
//     cell: {
//       userEnteredFormat: {
//         textFormat: {
//           bold: isBold,
//           foregroundColor: {
//             red: fontColor[0],
//             green: fontColor[1],
//             blue: fontColor[2],
//           },
//         },
//       },
//     },
//     fields: "userEnteredFormat(textFormat)",
//   },
// });

// for now only targets playlist export
export const importSpotifyDataIntoSheet = async (
  sheetsApi: sheets_v4.Sheets,
  spotifyAccessToken: string,
  exportProps: FeaturesOfSpotifyExport,
  spreadsheetID: string,
  lastSheetName: string,
  isImportingForTheFirstTime: boolean,
  firstSheetId: number,
): Promise<ImportSpotifyDataIntoSheetResponse> => {
  const {
    spotify: {
      playlist: { id: playlistId, lastTrackID },
    },
  } = exportProps;

  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(spotifyAccessToken);

  const {
    body: {
      name: playlistName,
      tracks: { total: numOfTotalTracks },
    },
  } = await getPlaylist(spotifyApi, playlistId);

  const shouldImportColumnData = isImportingForTheFirstTime || !!lastTrackID;
  let sheetName = lastSheetName;
  
  // first time importing this playlist
  if (!lastTrackID) {
    if (isImportingForTheFirstTime) {
      // as we create spreadsheet in GoogleController, we rename the default sheet and use it
      await renameSheet(sheetsApi, playlistName, spreadsheetID, firstSheetId);
    } else {
      await createNewSheet(sheetsApi, playlistName, spreadsheetID);
    }
    sheetName = playlistName;
  }
  
  const { lastQueried, tracks } = await fetchPlaylistTracks(
    spotifyAccessToken,
    playlistId,
  );

  const tracksData = tracks.map(Object.values);
  const data = shouldImportColumnData
    ? [Object.keys(spotifyPlaylistColumnNames), ...tracksData]
    : tracksData;

  await importRowsIntoSheet(
    spotifyApi,
    data,
    spreadsheetID,
    shouldImportColumnData ? 1 : 2,
    lastSheetName,
  );

  return ({
    numOfImportedItems: tracks.length,
    lastQueried,
    lastSheetName: sheetName,
    numOfTotalTracks,
  });
};
