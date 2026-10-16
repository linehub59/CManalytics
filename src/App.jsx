
import { useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  Activity,
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  Globe,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  Eye,
} from "lucide-react";
import { auth, db } from "./config/Firebase";
import "./index.css";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function normalizeDomain(value) {
  let input = String(value || "").trim().toLowerCase();

  if (!input) return "";

  try {
    if (!input.includes("://")) input = `https://${input}`;

    const url = new URL(input);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (
      !["http:", "https:"].includes(url.protocol) ||
      !host.includes(".") ||
      host === "localhost" ||
      /^[\d.]+$/.test(host)
    ) {
      return "";
    }

    return host;
  } catch {
    return "";
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function getTrackingSnippet(siteId) {
  const safeConfig = JSON.stringify(config);
  const safeId = JSON.stringify(siteId);

  return `<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const app = initializeApp(${safeConfig}, "castiel-" + ${safeId});
const db = getFirestore(app);
const siteId = ${safeId};
const key = "castiel-visitor-" + siteId;

function visitorId() {
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const host = location.hostname.toLowerCase().replace(/^www\\\\./, "");
const page = location.pathname + location.search;

if (host && page.length <= 1500) {
  addDoc(collection(db, "analyticsEvents"), {
    siteId,
    page,
    pageHost: host,
    visitorId: visitorId(),
    referrer: document.referrer.slice(0, 1500),
    createdAt: serverTimestamp()
  }).catch(() => {});
}
</script>`;
}

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (mode === "register") {
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      }
    } catch (err) {
      const messages = {
        "auth/email-already-in-use": "This email already has an account.",
        "auth/invalid-email": "Enter a valid email address.",
        "auth/weak-password": "Use a password with at least 6 characters.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/operation-not-allowed":
          "Enable Email/Password in Firebase Authentication.",
        "auth/network-request-failed": "Check your internet connection.",
      };

      setError(messages[err.code] || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-mark">C</div>
        <h1>Castiel Analytics</h1>
        <p className="muted">Know your website. Grow your business.</p>

        <label>Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          minLength={6}
          required
        />

        {error && <div className="error">{error}</div>}

        <button className="primary full" disabled={busy}>
          {busy ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
        </button>

        <button
          type="button"
          className="text-button full"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, note }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={20} />
      </div>
      <div className="stat-value">{formatNumber(value)}</div>
      <p>{note}</p>
    </article>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [sites, setSites] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedSite, setSelectedSite] = useState("all");
  const [siteName, setSiteName] = useState("");
  const [domain, setDomain] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [section, setSection] = useState("overview");
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
  }, []);

  async function refreshData() {
    if (!auth.currentUser) return;

    setLoading(true);
    setError("");

    try {
      const siteSnapshot = await getDocs(
        query(
          collection(db, "sites"),
          where("ownerId", "==", auth.currentUser.uid),
          limit(100)
        )
      );

      const ownSites = siteSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSites(ownSites);

      const eventResults = await Promise.all(
        ownSites.map(async (site) => {
          const snap = await getDocs(
            query(
              collection(db, "analyticsEvents"),
              where("siteId", "==", site.id),
              limit(500)
            )
          );

          return snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        })
      );

      setEvents(eventResults.flat());
    } catch (err) {
      setError(
        err.code === "permission-denied"
          ? "Permission denied. Check your Firestore Security Rules."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) refreshData();
    else {
      setSites([]);
      setEvents([]);
    }
  }, [user]);

  async function addWebsite(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    const cleanDomain = normalizeDomain(domain);

    if (!cleanDomain || !siteName.trim()) {
      setError("Enter a website name and a valid public domain.");
      setBusy(false);
      return;
    }

    try {
      const duplicate = sites.some((site) => site.domain === cleanDomain);

      if (duplicate) {
        throw new Error("This domain is already registered.");
      }

      const ref = await addDoc(collection(db, "sites"), {
        ownerId: auth.currentUser.uid,
        name: siteName.trim().slice(0, 80),
        domain: cleanDomain,
        enabled: true,
        createdAt: serverTimestamp(),
      });

      setSites((prev) => [
        ...prev,
        {
          id: ref.id,
          ownerId: auth.currentUser.uid,
          name: siteName.trim().slice(0, 80),
          domain: cleanDomain,
          enabled: true,
        },
      ]);

      setSelectedSite(ref.id);
      setSiteName("");
      setDomain("");
      setShowForm(false);
      setSection("websites");
      setNotice("Website registered. Install its tracking snippet to collect events.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copySnippet(siteId) {
    const snippet = getTrackingSnippet(siteId);

    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedId(siteId);
      setNotice("Tracking snippet copied.");
    } catch {
      setError("Clipboard unavailable. Select and copy the snippet shown below.");
      setSelectedSite(siteId);
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSite =
        selectedSite === "all" || event.siteId === selectedSite;

      const date = event.createdAt?.toDate?.();
      const recent = date && Date.now() - date.getTime() <= 30 * 86400000;

      return matchesSite && recent;
    });
  }, [events, selectedSite]);

  const visitors = new Set(filteredEvents.map((event) => event.visitorId)).size;
  const pageViews = filteredEvents.length;

  const popularPages = useMemo(() => {
    const counts = {};

    filteredEvents.forEach((event) => {
      const page = event.page || "/";
      counts[page] = (counts[page] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [filteredEvents]);

  const dailyViews = useMemo(() => {
    const days = [];

    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);

      const next = new Date(date);
      next.setDate(next.getDate() + 1);

      const count = filteredEvents.filter((event) => {
        const created = event.createdAt?.toDate?.();
        return created && created >= date && created < next;
      }).length;

      days.push({
        label: date.toLocaleDateString(undefined, { weekday: "short" }),
        count,
      });
    }

    return days;
  }, [filteredEvents]);

  if (authChecking) {
    return <div className="loading-screen">Loading Castiel Analytics...</div>;
  }

  if (!user) return <AuthScreen />;

  const selected = sites.find((site) => site.id === selectedSite);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <strong>Castiel</strong>
            <small>ANALYTICS</small>
          </div>
        </div>

        <p className="nav-caption">WORKSPACE</p>

        <button
          className={`nav-item ${section === "overview" ? "active" : ""}`}
          onClick={() => setSection("overview")}
        >
          <LayoutDashboard size={19} /> Overview
        </button>

        <button
          className={`nav-item ${section === "websites" ? "active" : ""}`}
          onClick={() => setSection("websites")}
        >
          <Globe size={19} /> Websites
        </button>

        <button
          className={`nav-item ${section === "pages" ? "active" : ""}`}
          onClick={() => setSection("pages")}
        >
          <BarChart3 size={19} /> Top pages
        </button>

        <div className="sidebar-bottom">
          <div className="user-info">
            <ShieldCheck size={19} />
            <span>{user.email}</span>
          </div>
          <button className="nav-item" onClick={() => signOut(auth)}>
            <LogOut size={19} /> Sign out
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">WEBSITE INTELLIGENCE</span>
            <h1>
              {section === "overview"
                ? "Overview"
                : section === "websites"
                ? "Your websites"
                : "Top pages"}
            </h1>
          </div>
          <button className="refresh-button" onClick={refreshData} disabled={loading}>
            <RefreshCw size={17} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </header>

        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        {section === "overview" && (
          <>
            <section className="welcome-row">
              <div>
                <h2>Your traffic at a glance</h2>
                <p>Analytics from the last 30 days.</p>
              </div>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                aria-label="Filter by website"
              >
                <option value="all">All websites</option>
                {sites.map((site) => (
                  <option value={site.id} key={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </section>

            <section className="stats-grid">
              <StatCard icon={Eye} label="Page views" value={pageViews} note="Recorded page visits" />
              <StatCard icon={Users} label="Unique visitors" value={visitors} note="Estimated from browser IDs" />
              <StatCard icon={Globe} label="Websites" value={sites.length} note="Registered properties" />
              <StatCard icon={Activity} label="Events loaded" value={filteredEvents.length} note="Up to 500 events per site" />
            </section>

            <section className="content-grid">
              <article className="panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Traffic trend</h3>
                    <p>Page views over the last 7 days</p>
                  </div>
                  <Activity size={20} />
                </div>

                <div className="bar-chart">
                  {dailyViews.map((day) => {
                    const maximum = Math.max(1, ...dailyViews.map((item) => item.count));
                    const height = Math.max(5, (day.count / maximum) * 100);

                    return (
                      <div className="bar-column" key={day.label}>
                        <span className="bar-value">{day.count}</span>
                        <div className="bar-track">
                          <div className="bar" style={{ height: `${height}%` }} />
                        </div>
                        <small>{day.label}</small>
                      </div>
                    );
                  })}
                </div>
                {events.length === 0 && (
                  <p className="empty-note">
                    No real events yet. Register a website and install its tracking code.
                  </p>
                )}
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Top pages</h3>
                    <p>Most viewed URLs</p>
                  </div>
                  <ChevronRight size={20} />
                </div>

                {popularPages.length ? (
                  <div className="page-list">
                    {popularPages.slice(0, 5).map(([page, count]) => (
                      <div className="page-row" key={page}>
                        <span title={page}>{page}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-note">Your popular pages will appear here.</p>
                )}
              </article>
            </section>
          </>
        )}

        {section === "websites" && (
          <section className="panel website-panel">
            <div className="panel-heading">
              <div>
                <h2>Manage websites</h2>
                <p>Register properties and install their tracking snippets.</p>
              </div>
              <button className="primary" onClick={() => setShowForm(!showForm)}>
                <Plus size={17} /> Add website
              </button>
            </div>

            {showForm && (
              <form className="website-form" onSubmit={addWebsite}>
                <label>
                  Website name
                  <input
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="My portfolio"
                    maxLength={80}
                    required
                  />
                </label>
                <label>
                  Domain
                  <input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="example.com"
                    required
                  />
                </label>
                <div className="form-actions">
                  <button type="button" className="secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button className="primary" disabled={busy}>
                    {busy ? "Saving..." : "Register website"}
                  </button>
                </div>
              </form>
            )}

            {sites.length === 0 ? (
              <div className="empty-state">
                <Globe size={36} />
                <h3>No websites yet</h3>
                <p>Add your first website to generate a tracking ID.</p>
              </div>
            ) : (
              <div className="website-list">
                {sites.map((site) => (
                  <article className="website-card" key={site.id}>
                    <div className="website-icon"><Globe size={22} /></div>
                    <div className="website-details">
                      <h3>{site.name}</h3>
                      <p>{site.domain}</p>
                      <small>ID: {site.id}</small>
                    </div>
                    <button
                      className="secondary"
                      onClick={() => copySnippet(site.id)}
                    >
                      {copiedId === site.id ? <Check size={16} /> : <Copy size={16} />}
                      {copiedId === site.id ? "Copied" : "Copy code"}
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setSelectedSite(selectedSite === site.id ? "all" : site.id)}
                    >
                      {selectedSite === site.id ? "Hide" : "Show"} snippet
                    </button>

                    {selectedSite === site.id && (
                      <textarea
                        className="snippet-box"
                        value={getTrackingSnippet(site.id)}
                        readOnly
                        rows={12}
                        onFocus={(e) => e.target.select()}
                        aria-label={`Tracking snippet for ${site.name}`}
                      />
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {section === "pages" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Top pages</h2>
                <p>Page views from the last 30 days.</p>
              </div>
            </div>
            {popularPages.length ? (
              <div className="page-list">
                {popularPages.map(([page, count]) => (
                  <div className="page-row" key={page}>
                    <span>{page}</span>
                    <strong>{formatNumber(count)} views</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-note">No page views recorded yet.</p>
            )}
          </section>
        )}

        <footer className="footer">
          <span>Castiel Analytics</span>
          <span>Data shown from your Firebase project</span>
        </footer>
      </main>
    </div>
  );
}
