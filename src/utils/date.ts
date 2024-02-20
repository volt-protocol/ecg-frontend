import moment from 'moment';

export const fromNow = (timestamp: number) => {
    return moment(timestamp).fromNow();
}

export function secondsToAppropriateUnit(seconds: number): string {
  // Convertir en minutes, heures, jours, semaines et mois
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;
  const weeks = days / 7;
  const months = days / 30;

  // Déterminer l'unité appropriée pour représenter la durée
  if (months >= 1) return `${Math.round(months)} month${Math.round(months) > 1 ? "s" : ""}`;
  if (weeks >= 1) return `${Math.round(weeks)} week${Math.round(weeks) > 1 ? "s" : ""}`;
  if (days >= 1) return `${Math.round(days)}day${Math.round(days) > 1 ? "s" : ""}`;
  if (hours >= 1) return `${Math.round(hours)}hour${Math.round(hours) > 1 ? "s" : ""}`;
  return `${Math.round(minutes)} minute${Math.round(minutes) > 1 ? "s" : ""}`;
}