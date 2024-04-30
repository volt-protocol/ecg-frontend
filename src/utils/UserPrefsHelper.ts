import { UserPreferences } from '../types/user-prefs';

let userPrefs: UserPreferences;
const USER_PREFS_KEY = 'user-prefs';
export function GetUserPrefs() {
  const userPrefStorage = localStorage.getItem(USER_PREFS_KEY);
  if (!userPrefStorage) {
    if (!userPrefs) {
      userPrefs = {
        darkMode: undefined
      };
    }

    SaveUserPrefs(userPrefs);
    return GetUserPrefs();
  } else {
    userPrefs = JSON.parse(userPrefStorage);
    return userPrefs;
  }
}

export function SaveUserPrefs(userPrefs: UserPreferences) {
  localStorage.setItem(USER_PREFS_KEY, JSON.stringify(userPrefs));
}

export function UpdateUserPrefsDarkMode(darkMode: boolean) {
  const userPrefs = GetUserPrefs();
  userPrefs.darkMode = darkMode;
  SaveUserPrefs(userPrefs);
}
