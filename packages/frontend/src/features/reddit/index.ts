import { createAsyncThunk } from "@reduxjs/toolkit";
import { setMessage } from "../../app/smsSlice";
import { ThunkAPI } from "../../app/store";
import { prepareBlobURL } from "../../util";
import { SavedModel } from "./endpointTypes";
import { fetchAuthURL, fetchSavedModels } from "./redditApiService";
import { GetSavedModelsThunkResponse } from "./types";

export const getAuthURL = createAsyncThunk("reddit/authURL", async () => {
  const response = await fetchAuthURL();
  return response.data.url;
});

export const getSavedModels = createAsyncThunk<
  GetSavedModelsThunkResponse,
  void,
  ThunkAPI
>(
  "reddit/getSavedModels",
  async (_, { dispatch }) => {
    const recursivelyCollectItems = async (
      items: SavedModel[],
      lastItemID = "",
    ) => {
      dispatch(setMessage(
        `Getting items from ${items.length} to ${items.length + 100}.`,
      ));
      const {
        data: {
          models, lastQueried,
        },
      } = await fetchSavedModels(lastItemID);

      items.push(...models);

      dispatch(setMessage(
        `Successfully imported items from ${items.length} to ${
          items.length + models.length
        }`,
      ));

      // if there may be more to fetch
      if (models.length === 100) {
        await recursivelyCollectItems(items, lastQueried);
      }
    };

    const items = [] as SavedModel[];
    await recursivelyCollectItems(items);
    const fileName = "reddit_items.csv";
    const url = prepareBlobURL(items, "text/csv");

    return { url, fileName };
  },
);