import { Client } from "@notionhq/client";
import {
  AccessTokenReqConfig,
  FeaturesOfRedditExport,
} from "../../controllers/types.js";
import { fetchSavedModels } from "../reddit/index.js";
import { ProcessedSavedChildren } from "../reddit/types.js";
import DBCreator from "./dbCreator.js";
import PageCreator,
{ createRedditPropsForDBPage } from "./pageCreator.js";
import { CreateDBPropArguments, CreatePagesFromRedditExportPropsResponse } from "./types.js";

export const getAuthOptions = (
  code: string,
  redirect_uri: string,
  clientID: string,
  secret: string,
): AccessTokenReqConfig => ({
  url: 'https://api.notion.com/v1/oauth/token',
  form: {
    code,
    redirect_uri,
    grant_type: 'authorization_code',
  },
  axiosConfig: {
    headers: {
      Authorization:
        'Basic ' + Buffer.from(clientID + ':' + secret).toString('base64'),
      'Content-Type': 'application/json',
    },
  },
});

export const getLastEditedPage = async (notion: Client) => {
  const {
    results: [page],
  } = await notion.search({
    query: '',
    sort: {
      direction: 'descending',
      timestamp: 'last_edited_time',
    },
    filter: {
      property: 'object',
      value: 'page',
    },
  });
  return page;
};

export const updateDBTitle = (notion: Client, title: string, dbID: string) => {
  return notion.databases.update({
    database_id: dbID,
    title: [
      {
        text: {
          content: title,
        },
      },
    ],
  });
};

export const retrieveDB = (notion: Client, dbID: string) =>
  notion.databases.retrieve({ database_id: dbID });

export const createDB = async (
  notion: Client,
  parentPageID: string,
  title: string,
  properties: Array<CreateDBPropArguments>,
) => {
  const dbCreator = DBCreator();
  const db = await dbCreator.createDB(notion, parentPageID, title, properties);
  return db;
};

const createPagesFromRedditModels = async (
  notion: Client,
  dbID: string,
  models: ProcessedSavedChildren[],
) => {
  const pageCreator = PageCreator();
  return Promise.all(
    models.map(async (model) =>
      pageCreator.createDBPage(notion, dbID, createRedditPropsForDBPage(model)),
    ),
  );
}; 

export const createPagesFromRedditExportProps = async (
  notion: Client,
  redditAccessToken,
  dbID: string,
  exportProps: FeaturesOfRedditExport,
): CreatePagesFromRedditExportPropsResponse => {
  const { reddit: { saved: { lastItemID }}} = exportProps as FeaturesOfRedditExport;
  const { models, lastQueried } = await fetchSavedModels(redditAccessToken, lastItemID);
  await createPagesFromRedditModels(notion, dbID, models);
  return {
    numOfImportedItems: models.length,
    newExportProps: {
      reddit: {
        saved: {
          lastItemID: lastQueried
        }
      }
    }
  };
};