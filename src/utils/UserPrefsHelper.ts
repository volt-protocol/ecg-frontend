import { UserPreferences } from '../types/user-prefs';

const USER_PREFS_KEY = 'user-prefs';
export function GetUserPrefs() {
  const userPrefStorage = window.localStorage.getItem(USER_PREFS_KEY);
  if (!userPrefStorage) {
    SaveUserPrefs({
      darkMode: undefined
    });
    return GetUserPrefs();
  } else {
    const userPrefs = JSON.parse(userPrefStorage);
    return userPrefs;
  }
}

export function SaveUserPrefs(userPrefs: UserPreferences) {
  window.localStorage.setItem(USER_PREFS_KEY, JSON.stringify(userPrefs));
}

export function UpdateUserPrefsDarkMode(darkMode: boolean) {
  const userPrefs = GetUserPrefs();
  userPrefs.darkMode = darkMode;
  SaveUserPrefs(userPrefs);
}

export function UpdateUserPrefsChainId(chainId: number) {
  const userPrefs = GetUserPrefs();
  userPrefs.chainId = chainId;
  SaveUserPrefs(userPrefs);
}

export function UpdateUserPrefsMarketId(marketId: number) {
  const userPrefs = GetUserPrefs();
  userPrefs.marketId = marketId;
  SaveUserPrefs(userPrefs);
}
