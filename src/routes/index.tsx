import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AudioLines, Headphones, Heart, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePodcast } from "@/lib/podcast.functions";
import headphones from "@/assets/headphones.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pocket Podcast — A little space for big ideas" },
      { name: "description", content: "Your curiosity, your podcast. Dream up a topic in Pocket Podcast, a friendly space for your next listening adventure." },
      { property: "og:title", content: "Pocket Podcast — A little space for big ideas" },
      { property: "og:description", content: "Your curiosity, your podcast. A friendly space for your next listening adventure." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Status = "idle" | "loading" | "ready" | "error";

function Index() {
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [audioUrl, setAudioUrl] = useState("");

  async function generatePodcast(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading" || !topic.trim()) return;
    setStatus("loading");
    try {
      const result = await generatePodcast({ data: { text: topic.trim() } });
      if (result.ok) {
        setAudioUrl(result.audioFile);
        setTopic("");
        setStatus("ready");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="podcast-page">
      <header className="site-header">
        <a href="/" className="wordmark" aria-label="Pocket Podcast home">
          <span className="brand-icon"><AudioLines size={22} strokeWidth={2.2} /></span>
          pocket<span className="text-muted-foreground">podcast</span><span className="brand-dot">.</span>
        </a>
        <span className="header-note"><span className="status-dot" /> A little space for big ideas</span>
      </header>

      <main className="main-content">
        <section className="intro" aria-labelledby="page-title">
          <img className="headphone-art" src={headphones} alt="Soft pink headphones with a mint sparkle" width={768} height={768} />
          <span className="eyebrow"><Sparkles size={13} /> MADE FOR YOUR CURIOSITY</span>
          <h1 id="page-title">Your personal <span>podcast.</span></h1>
          <p>A big question. A niche obsession. A passing thought.<br className="desktop-break" /> Whatever’s on your mind, let’s give it a voice.</p>
        </section>

        <form className="topic-form" onSubmit={generatePodcast}>
          <label htmlFor="topic">What are you curious about?</label>
          <div className="topic-input-wrap">
            <Sparkles size={20} aria-hidden="true" />
            <input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Type podcast topic here..." aria-label="Type podcast topic here..." autoComplete="off" maxLength={500} />
          </div>
          <Button type="submit" className="generate-button" disabled={status === "loading"}>
            <span aria-hidden="true">🔊</span> {status === "loading" ? "Creating your podcast…" : "Generate Podcast"}
            {status !== "loading" && <Sparkles size={16} aria-hidden="true" />}
          </Button>
        </form>

        <section className="listening-section" aria-labelledby="listening-title">
          <div className="section-label"><Headphones size={15} /><h2 id="listening-title">YOUR LISTENING CORNER</h2><span className="label-line" /></div>
          <div className="audio-area" aria-live="polite" aria-busy={status === "loading"}>
            {status === "loading" && (
              <div className="audio-message">
                <div className="loading-dots" aria-label="Generating podcast"><span /><span /><span /></div>
                <h3>Creating podcast... please wait!</h3>
                <p>Good things take a little time.</p>
              </div>
            )}
            {status === "ready" && (
              <div className="audio-message">
                <span className="player-icon">🎧</span>
                <h3>Podcast is ready! Click play to listen</h3>
                <p>Enjoy your episode — it’s all yours.</p>
              </div>
            )}
            {status === "error" && (
              <div className="audio-message">
                <span className="player-icon">⚠️</span>
                <h3>Oops! Something went wrong. Please try again</h3>
                <p>Take a breath, then give it another go.</p>
              </div>
            )}
            {status === "idle" && (
              <div className="audio-message">
                <span className="player-icon"><AudioLines size={27} /></span>
                <h3>Podcast will appear here.</h3>
                <p>Your next rabbit hole, ready when you are.</p>
              </div>
            )}
            {status === "ready" && audioUrl ? (
              <audio className="audio-player" controls src={audioUrl}>
                Your browser does not support audio playback.
              </audio>
            ) : (
              <div className="player-preview" aria-hidden="true">
                <span className="play-preview"><Play size={15} fill="currentColor" /></span>
                <span className="time-preview">0:00</span>
                <div className="waveform">{Array.from({ length: 58 }, (_, i) => <span key={i} className={`wave wave-${i % 9}`} />)}</div>
                <span className="time-preview">--:--</span>
              </div>
            )}
          </div>
        </section>
        <p className="closing-note">For the beautifully curious minds.</p>
      </main>

      <footer className="site-footer"><span>© 2026 Pocket Podcast</span><span>Made with <Heart size={12} /> & a little curiosity</span></footer>
    </div>
  );
}
