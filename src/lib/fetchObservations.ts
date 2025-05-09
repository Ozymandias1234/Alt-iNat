// src/lib/fetchObservations.ts
import { friends } from "./friends";

export async function fetchObservations() {
  const logins = friends.join(",");
  const url = `https://api.inaturalist.org/v1/observations?user_login=${logins}&order=desc&order_by=created_at&per_page=30`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`iNat API error: ${res.status}`);
  const json = await res.json();
  return json.results;  // array of observation objects
}
