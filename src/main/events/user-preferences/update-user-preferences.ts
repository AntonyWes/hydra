import { userPreferencesRepository } from "@main/repository";
import { registerEvent } from "../register-event";

import type { UserPreferences } from "@types";
import i18next from "i18next";

const updateUserPreferences = async (
  _event: Electron.IpcMainInvokeEvent,
  preferences: Partial<UserPreferences>
) => {
  console.log("Received preferences:", preferences);

  if (preferences.language) {
    i18next.changeLanguage(preferences.language);
  }

  console.log("Updated preferences:", preferences);

  return userPreferencesRepository.upsert(
    {
      id: 1,
      ...preferences,
    },
    ["id"]
  );
};

registerEvent("updateUserPreferences", updateUserPreferences);
