"use client";

import { useState, useEffect } from "react";

type Observation = {
  id: number;
  created_at: string;
  species_guess: string;
  taxon?: { name: string; preferred_common_name: string | null };
  photos: { url: string }[];
  user: { login: string };
  uri: string;
  place_guess?: string;
  description?: string;
};

export default function Home() {
  const [friends, setFriends] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [observations, setObservations] = useState<Observation[]>([]);
  const [monthData, setMonthData] = useState<Record<string, Observation[]>>({});
  const [loading, setLoading] = useState(false);
  const [perPage, setPerPage] = useState<number>(10);
  const [newObservations, setNewObservations] = useState<Observation[]>([]);
  const [liked, setLiked] = useState<number[]>([]);
  const [showLiked, setShowLiked] = useState(false);

  // Date boundaries
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 7);
  const start30Days = new Date();
  start30Days.setDate(now.getDate() - 30);

  // Load persisted data
  useEffect(() => {
    const storedFriends = localStorage.getItem("friends");
    if (storedFriends) {
      try { setFriends(JSON.parse(storedFriends)); } catch {}
    }
    const storedLikes = localStorage.getItem("liked");
    if (storedLikes) {
      try { setLiked(JSON.parse(storedLikes)); } catch {}
    }
  }, []);

  // Fetch data
  useEffect(() => {
    localStorage.setItem("friends", JSON.stringify(friends));
    if (!friends.length) {
      setObservations([]);
      setMonthData({});
      setNewObservations([]);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        // General fetch
        const generalArrays = await Promise.all(
          friends.map(async (user) => {
            const res = await fetch(
              `https://api.inaturalist.org/v1/observations?user_login=${user}` +
              `&order=desc&order_by=created_at&per_page=${perPage}`
            );
            const json = await res.json();
            return (json.results || []).map((o: any) => ({
              id: o.id,
              created_at: o.created_at,
              species_guess: o.species_guess,
              taxon: o.taxon,
              photos: o.photos,
              user: o.user,
              uri: o.uri,
              place_guess: o.place_guess,
              description: o.description,
            } as Observation));
          })
        );
        const allGeneral = generalArrays.flat();
        setObservations(allGeneral);

        // New since last visit
        const lastVisit = localStorage.getItem("lastVisit");
        const lastDate = lastVisit ? new Date(lastVisit) : new Date(0);
        setNewObservations(
          allGeneral.filter((o) => new Date(o.created_at) > lastDate)
        );
        localStorage.setItem("lastVisit", new Date().toISOString());

        // 30-day window fetch
        const monthArrays = await Promise.all(
          friends.map(async (user) => {
            const d1 = start30Days.toISOString().split("T")[0];
            const d2 = startWeek.toISOString().split("T")[0];
            const res = await fetch(
              `https://api.inaturalist.org/v1/observations?user_login=${user}` +
              `&d1=${d1}&d2=${d2}&order=desc&order_by=created_at&per_page=200`
            );
            const json = await res.json();
            return (json.results || []).map((o: any) => ({
              id: o.id,
              created_at: o.created_at,
              species_guess: o.species_guess,
              taxon: o.taxon,
              photos: o.photos,
              user: o.user,
              uri: o.uri,
              place_guess: o.place_guess,
              description: o.description,
            } as Observation));
          })
        );
        const map: Record<string, Observation[]> = {};
        friends.forEach((user, i) => { map[user] = monthArrays[i]; });
        setMonthData(map);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [friends, perPage]);

  // Persist likes
  useEffect(() => {
    localStorage.setItem("liked", JSON.stringify(liked));
  }, [liked]);

  const addFriend = (e: React.FormEvent) => {
    e.preventDefault();
    const name = input.trim();
    if (name && !friends.includes(name)) setFriends([...friends, name]);
    setInput("");
  };
  const removeFriend = (name: string) => setFriends((prev) => prev.filter((u) => u !== name));
  const toggleLike = (id: number) => {
    setLiked((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  // Filter for general sections
  const sectionForUser = (user: string, from: Date, to?: Date) =>
    observations.filter((o) => {
      const d = new Date(o.created_at);
      return o.user.login === user && d >= from && (to ? d < to : true);
    });

  // Section renderer
  const renderSection = (
    title: string,
    from: Date,
    to?: Date,
    useMonthMap = false
  ) => (
    <div className="mb-8" key={title}>
      <h2 className="text-4xl font-serif font-bold mb-4 border-b-2 border-green-700 pb-2">{title}</h2>
      {friends.map((u) => {
        const items = useMonthMap ? monthData[u] || [] : sectionForUser(u, from, to);
        return (
          <div key={u} className="mb-6">
            <h3 className="font-serif font-semibold text-2xl mb-2">{u}</h3>
            {items.length ? (
              <div className="flex overflow-x-auto gap-4">
                {items.map((o) => (
                  <div key={o.id} className="flex-shrink-0 w-60 border rounded-lg bg-white shadow hover:shadow-lg transition-shadow duration-200">
                    <div className="p-2">
                      <p className="font-serif font-semibold text-lg">
                        {o.taxon?.preferred_common_name || o.species_guess}
                        <span className="italic text-sm pl-1">({o.taxon?.name})</span>
                      </p>
                    </div>
                    {o.photos[0] && (
                      <a href={o.uri} target="_blank" rel="noopener noreferrer">
                        <img src={o.photos[0].url.replace("square","medium")} alt={o.species_guess} className="w-full h-40 object-cover rounded-b-lg" />
                      </a>
                    )}
                    <div className="p-2">
                      <p className="font-serif"><span className="font-bold">Location:</span> {o.place_guess}</p>
                      <p className="text-sm mt-1 font-serif">
                        {o.description ? (o.description.length > 40 ? o.description.slice(0,40) + "..." : o.description) : ""}
                      </p>
                      <a href={o.uri} className="text-blue-600 underline font-serif block mt-2 transition-colors duration-200 hover:text-blue-800" target="_blank" rel="noopener noreferrer">
                        View on iNaturalist
                      </a>
                      <button onClick={() => toggleLike(o.id)} className="mt-2 text-green-700 text-2xl transition-transform duration-200 hover:scale-110">
                        {liked.includes(o.id) ? "❤️" : "🤍"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-serif">No observations for {u} in this period.</p>
            )}
          </div>
        );
      })}
    </div>
  );

  const likedObservations = observations.filter((o) => liked.includes(o.id));

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-white shadow-md z-20">
        <div className="max-w-4xl mx-auto h-16 flex items-center px-6">
          <h1 className="text-2xl font-serif font-bold text-green-700">alt‑iNat Feed</h1>
        </div>
      </header>
      <main className="pt-24 p-8 max-w-4xl mx-auto bg-green-50 text-gray-900 font-sans">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <form onSubmit={addFriend} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter username"
              className="border px-4 py-2 rounded shadow-inner focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button className="bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 transition-colors duration-200 font-semibold">
              Add Friend
            </button>
          </form>
          {friends.map((u) => (
            <span key={u} className="inline-flex items-center bg-green-100 px-3 py-1 rounded-full font-serif">
              {u}
              <button onClick={() => removeFriend(u)} className="ml-2 text-red-600 font-bold hover:text-red-800 transition-colors duration-200">✕</button>
            </span>
          ))}
          <div className="ml-auto flex gap-2">
            <label className="font-serif">
              Items per user:
              <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="ml-2 border rounded px-2 py-1 focus:outline-none">
                {[5,10,15,20].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button onClick={() => setShowLiked(prev => !prev)} className="border px-3 py-2 rounded-full hover:bg-green-100 transition-colors duration-200 font-medium">
              {showLiked ? "Show All" : "Show Liked"}
            </button>
          </div>
        </div>

        {loading && <p className="font-serif">Loading…</p>}

        {!showLiked ? (
          <>
            {renderSection("Today", startToday)}
            {renderSection("This Week", startWeek, startToday)}
            {renderSection("Last 30 Days", start30Days, startWeek, true)}
          </>
        ) : (
          <section className="mb-8">
            <h2 className="text-4xl font-serif font-bold mb-4 text-green-700">Liked Observations</h2>
            {likedObservations.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {likedObservations.map(o => (
                  <div key={o.id} className="border p-4 rounded-lg bg-white shadow hover:shadow-lg transition-shadow duration-200">
                    {o.photos[0] && (
                      <a href={o.uri} target="_blank" rel="noopener noreferrer">
                        <img src={o.photos[0].url.replace("square","medium")} alt={o.species_guess} className="w-full h-40 object-cover rounded-t-lg" />
                      </a>
                    )}
                    <h3 className="mt-2 font-serif font-semibold text-lg">
                      {o.taxon?.preferred_common_name || o.species_guess} <span className="italic text-sm">({o.taxon?.name})</span>
                    </h3>
                    <p className="mt-2 font-serif"><span className="font-bold">Location:</span> {o.place_guess}</p>
                    <p className="text-sm mt-1 font-serif">
                      {o.description && (o.description.length > 40 ? o.description.slice(0,40)+"..." : o.description)}
                    </p>
                    <a href={o.uri} className="text-blue-600 underline font-serif block mt-2 hover:text-blue-800 transition-colors duration-200" target="_blank" rel="noopener noreferrer">
                      View on iNaturalist
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-serif">No liked observations yet.</p>
            )}
          </section>
        )}
      </main>
    </>
  );
}
