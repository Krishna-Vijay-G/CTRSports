import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import landingContent from '../assets/data/landing_page_content.json';

type LandingContent = {
  splash: {
    title: string;
    aria_label: string;
    logo_image: string;
    fade_in_ms: number;
    hide_ms: number;
  };
  brand: {
    name: string;
    subtitle: string;
    logo_image: string;
    home_aria_label: string;
  };
  hero: {
    kicker: string;
    title: string;
    subtitle: string;
    about_title: string;
    about_body: string;
    background_image: string;
  };
  sports_section: {
    kicker: string;
    title: string;
  };
  sports: Array<{
    id: string;
    name: string;
    team_name: string;
    description: string;
    website_url: string;
    logo_image: string;
    visit_label: string;
  }>;
};

const content = landingContent as LandingContent;

function LandingPage(): React.ReactElement {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFadeSplash(true), content.splash.fade_in_ms);
    const hideTimer = window.setTimeout(() => setShowSplash(false), content.splash.hide_ms);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {showSplash ? (
        <div className={`splash ${fadeSplash ? 'fade-out' : ''}`} aria-label={content.splash.aria_label}>
          <img src={content.splash.logo_image} alt="CTR Unified logo" className="splash-logo" />
          <p>{content.splash.title}</p>
        </div>
      ) : null}

      <main className="page" id="main-content">
        <header className="topbar section">
          <a href="#main-content" className="brand" aria-label={content.brand.home_aria_label}>
            <img src={content.brand.logo_image} alt="CTR Unified logo" className="brand-logo" />
            <div>
              <strong>{content.brand.name}</strong>
              <span>{content.brand.subtitle}</span>
            </div>
          </a>
        </header>

        <section className="hero section" id="about">
          <p className="kicker">{content.hero.kicker}</p>
          <h1>{content.hero.title}</h1>
          <p className="subtitle">{content.hero.subtitle}</p>
          <div className="about-panel">
            <h2>{content.hero.about_title}</h2>
            <p>{content.hero.about_body}</p>
          </div>
        </section>

        <section className="sports section" id="sports">
          <div className="sports-head">
            <p className="kicker">{content.sports_section.kicker}</p>
            <h2>{content.sports_section.title}</h2>
          </div>

          <div className="sports-grid" role="list">
            {content.sports.map((sport, index) => (
              <a
                key={sport.id}
                role="listitem"
                href={sport.website_url}
                target="_blank"
                rel="noreferrer"
                className="sport-card"
                style={{ animationDelay: `${index * 50}ms` }}
                aria-label={`Open ${sport.name} website`}
              >
                <div className="sport-top">
                  <img src={sport.logo_image} alt={`${sport.name} logo`} className="sport-logo" loading="lazy" />
                  <span className="visit-chip">{sport.visit_label}</span>
                </div>
                <h3>{sport.name}</h3>
                <p className="team">{sport.team_name}</p>
                <p className="description">{sport.description}</p>
              </a>
            ))}
          </div>
        </section>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&family=Barlow+Condensed:wght@600;700&display=swap');

          :root {
            --bg: #090909;
            --surface: #111111;
            --surface-soft: #171717;
            --text: #f4f4f4;
            --muted: #bebebe;
            --yellow: #f7d619;
            --line: rgba(247, 214, 25, 0.25);
            --line-soft: rgba(247, 214, 25, 0.14);
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: var(--bg);
          }

          .splash {
            position: fixed;
            inset: 0;
            z-index: 999;
            display: grid;
            place-content: center;
            justify-items: center;
            gap: 10px;
            background: radial-gradient(circle at center, #191919 0%, #060606 62%);
            transition: opacity 420ms ease;
          }

          .splash.fade-out {
            opacity: 0;
            pointer-events: none;
          }

          .splash-logo {
            width: min(260px, 48vw);
            animation: splashPulse 1100ms ease-in-out infinite alternate;
          }

          .splash p {
            margin: 0;
            color: var(--yellow);
            font-family: 'Barlow Condensed', sans-serif;
            letter-spacing: 0.22em;
            font-size: 0.86rem;
            text-transform: uppercase;
          }

          .page {
            min-height: 100vh;
            color: var(--text);
            font-family: 'Outfit', sans-serif;
            background:
              linear-gradient(140deg, rgba(7, 7, 7, 0.9) 0%, rgba(7, 7, 7, 0.76) 42%, rgba(7, 7, 7, 0.92) 100%),
              url('${content.hero.background_image}');
            background-position: center;
            background-size: cover;
            background-repeat: no-repeat;
            background-attachment: fixed;
            padding: 18px 0 56px;
          }

          .section {
            width: min(1160px, 100%);
            margin: 0 auto;
            padding: 0 20px;
          }

          .topbar {
            margin-bottom: 22px;
          }

          .brand {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: inherit;
            min-height: 48px;
          }

          .brand-logo {
            width: 158px;
            max-width: 36vw;
            object-fit: contain;
          }

          .brand strong {
            display: block;
            font-family: 'Barlow Condensed', sans-serif;
            letter-spacing: 0.1em;
            color: var(--yellow);
            font-size: 1.06rem;
            line-height: 1;
          }

          .brand span {
            display: block;
            color: #9a9a9a;
            font-size: 0.75rem;
            letter-spacing: 0.18em;
          }

          .hero {
            border: 1px solid var(--line);
            border-radius: 24px;
            background: linear-gradient(140deg, rgba(247, 214, 25, 0.12), rgba(247, 214, 25, 0.02) 40%, #0f0f0f 100%);
            padding: clamp(22px, 4vw, 42px);
          }

          .kicker {
            margin: 0;
            color: var(--yellow);
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.2em;
            font-size: 0.73rem;
          }

          .hero h1 {
            margin: 8px 0 0;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: clamp(2.4rem, 6vw, 4.6rem);
            line-height: 0.95;
            letter-spacing: 0.02em;
            text-transform: uppercase;
          }

          .subtitle {
            margin: 10px 0 0;
            white-space: pre-line;
            max-width: 760px;
            color: #f0f0f0;
            line-height: 1.6;
            font-size: clamp(0.96rem, 1.9vw, 1.14rem);
          }

          .about-panel {
            margin-top: 18px;
            border: 1px solid var(--line-soft);
            border-radius: 16px;
            background: rgba(0, 0, 0, 0.36);
            padding: 16px;
            max-width: 900px;
          }

          .about-panel h2 {
            margin: 0;
            color: var(--yellow);
            font-family: 'Barlow Condensed', sans-serif;
            font-size: clamp(1.2rem, 2.6vw, 1.8rem);
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .about-panel p {
            margin: 8px 0 0;
            color: var(--muted);
            line-height: 1.72;
            max-width: 75ch;
          }

          .sports {
            margin-top: 24px;
          }

          .sports-head h2 {
            margin: 5px 0 0;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: clamp(1.6rem, 4vw, 2.35rem);
            letter-spacing: 0.03em;
            text-transform: uppercase;
          }

          .sports-grid {
            margin-top: 14px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }

          .sport-card {
            border: 1px solid var(--line-soft);
            border-radius: 18px;
            background: linear-gradient(180deg, #151515 0%, #0c0c0c 100%);
            padding: 14px;
            text-decoration: none;
            color: inherit;
            min-height: 264px;
            display: grid;
            grid-template-rows: auto auto auto 1fr;
            gap: 8px;
            opacity: 0;
            transform: translateY(14px);
            animation: cardIn 360ms ease-out forwards;
            transition: border-color 220ms ease, transform 220ms ease, box-shadow 220ms ease;
          }

          .sport-card:hover {
            transform: translateY(-4px);
            border-color: var(--line);
            box-shadow: 0 14px 28px rgba(0, 0, 0, 0.42);
          }

          .sport-card:focus-visible {
            outline: 2px solid var(--yellow);
            outline-offset: 2px;
          }

          .sport-top {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 90px;
            position: relative;
          }

          .sport-logo {
            width: 98px;
            height: 98px;
            object-fit: contain;
          }

          .visit-chip {
            position: absolute;
            right: 0;
            top: 0;
            display: inline-flex;
            min-height: 32px;
            align-items: center;
            justify-content: center;
            padding: 0 12px;
            border-radius: 999px;
            background: rgba(247, 214, 25, 0.14);
            border: 1px solid rgba(247, 214, 25, 0.35);
            color: var(--yellow);
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 700;
          }

          .sport-card h3 {
            margin: 2px 0 0;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.35rem;
            letter-spacing: 0.03em;
            line-height: 1.05;
            text-transform: uppercase;
          }

          .team {
            margin: 0;
            color: var(--yellow);
            font-size: 0.78rem;
            letter-spacing: 0.13em;
            text-transform: uppercase;
            font-weight: 700;
          }

          .description {
            margin: 0;
            color: var(--muted);
            font-size: 0.92rem;
            line-height: 1.62;
          }

          @keyframes splashPulse {
            from {
              opacity: 0.56;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes cardIn {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (max-width: 980px) {
            .sports-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 640px) {
            .section {
              padding: 0 12px;
            }

            .brand {
              align-items: flex-start;
            }

            .brand-logo {
              width: 130px;
            }

            .hero {
              padding: 20px 16px;
            }

            .sports-grid {
              grid-template-columns: 1fr;
            }

            .sport-card {
              min-height: 244px;
            }

            .sport-logo {
              width: 86px;
              height: 86px;
            }
          }

          @media (max-width: 900px) {
            .page {
              background-attachment: scroll;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .splash,
            .splash-logo,
            .sport-card {
              transition: none;
              animation: none;
            }

            .sport-card {
              opacity: 1;
              transform: none;
            }
          }
        `}</style>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>
);
