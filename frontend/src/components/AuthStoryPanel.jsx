/**
 * Line-art storytelling for auth screens — navy/gold, discreet motion.
 */

/** Classic ledger plate for login */
function LoginStoryArt({ className = '' }) {
  return (
    <svg
      className={`auth-story-art auth-story-art--login ${className}`}
      viewBox="0 0 360 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <filter id="login-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="ledger-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4E0A5" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#D4B16D" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#8B7355" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <rect
        className="auth-fade auth-fade-1"
        x="58"
        y="48"
        width="244"
        height="324"
        rx="32"
        stroke="url(#ledger-edge)"
        strokeWidth="1.6"
        fill="rgba(15,21,38,0.5)"
      />
      <rect
        className="auth-fade auth-fade-2"
        x="72"
        y="62"
        width="216"
        height="296"
        rx="24"
        stroke="rgba(212,177,109,0.28)"
        strokeWidth="1"
      />

      <g className="auth-fade auth-fade-2" stroke="rgba(212,177,109,0.4)" strokeWidth="1.1" strokeLinecap="round">
        <path d="M88 78 H104 M88 78 V94" />
        <path d="M272 78 H256 M272 78 V94" />
        <path d="M88 342 H104 M88 342 V326" />
        <path d="M272 342 H256 M272 342 V326" />
      </g>

      <g className="auth-seal" filter="url(#login-glow)">
        <circle
          className="auth-seal-halo"
          cx="180"
          cy="108"
          r="28"
          stroke="#D4B16D"
          strokeWidth="1.2"
          fill="none"
        />
        <circle
          className="auth-seal-ring auth-seal-ring--outer"
          cx="180"
          cy="108"
          r="28"
          stroke="#D4B16D"
          strokeWidth="1.5"
          fill="rgba(10,15,26,0.65)"
        />
        <circle
          className="auth-seal-ring auth-seal-ring--inner"
          cx="180"
          cy="108"
          r="16"
          stroke="rgba(244,224,165,0.45)"
          strokeWidth="1"
          fill="none"
        />
        <text
          x="180"
          y="113"
          textAnchor="middle"
          fill="#D4B16D"
          style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '13px', letterSpacing: '0.16em' }}
        >
          Q
        </text>
      </g>

      <g className="auth-fade auth-fade-2">
        <rect
          x="104"
          y="152"
          width="152"
          height="168"
          rx="4"
          stroke="rgba(253,250,245,0.3)"
          strokeWidth="1.2"
          fill="rgba(253,250,245,0.03)"
        />
        <line x1="180" y1="156" x2="180" y2="316" stroke="rgba(212,177,109,0.18)" strokeWidth="1" />
        <path className="auth-draw auth-draw-1" d="M116 178 H168" stroke="#D4B16D" strokeWidth="1.3" strokeLinecap="round" />
        <path className="auth-draw auth-draw-2" d="M116 198 H160" stroke="rgba(253,250,245,0.32)" strokeWidth="1.1" strokeLinecap="round" />
        <path className="auth-draw auth-draw-3" d="M116 218 H164" stroke="rgba(253,250,245,0.22)" strokeWidth="1.05" strokeLinecap="round" />
        <path d="M116 238 H152" stroke="rgba(253,250,245,0.16)" strokeWidth="1" strokeLinecap="round" />
        <path className="auth-draw auth-draw-1" d="M192 178 H244" stroke="rgba(232,199,122,0.55)" strokeWidth="1.2" strokeLinecap="round" />
        <path className="auth-draw auth-draw-2" d="M192 198 H236" stroke="rgba(253,250,245,0.28)" strokeWidth="1.05" strokeLinecap="round" />
        <path className="auth-draw auth-draw-3" d="M192 218 H228" stroke="rgba(253,250,245,0.18)" strokeWidth="1" strokeLinecap="round" />
        <path
          d="M192 278 H244"
          stroke="rgba(212,177,109,0.45)"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeDasharray="3 3"
        />
        <circle cx="218" cy="262" r="10" stroke="rgba(212,177,109,0.4)" strokeWidth="1" />
        <text
          x="218"
          y="266"
          textAnchor="middle"
          fill="rgba(212,177,109,0.7)"
          style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '8px' }}
        >
          Q
        </text>
      </g>

      <g className="auth-fade auth-fade-3">
        <line x1="104" y1="338" x2="148" y2="338" stroke="rgba(253,250,245,0.2)" strokeWidth="1" />
        <text
          x="256"
          y="342"
          textAnchor="end"
          fill="rgba(212,177,109,0.7)"
          style={{ fontFamily: "'IBM Plex Mono', Consolas, monospace", fontSize: '9px', letterSpacing: '0.08em' }}
        >
          LEDGER
        </text>
      </g>
    </svg>
  );
}

/** AI-generated gold line-art scene for registration */
function RegisterStoryArt({ className = '' }) {
  return (
    <img
      src="/illustrations/login-ledger-scene.png?v=3"
      alt=""
      aria-hidden="true"
      className={`auth-story-illustration auth-story-illustration--register ${className}`}
      draggable={false}
    />
  );
}

const STORIES = {
  login: {
    title: 'Your private ledger awaits.',
    lede: 'Goals, allocations, and history—exactly as you left them.',
    Art: LoginStoryArt,
  },
  forgot: {
    title: 'Recover access.',
    lede: 'We’ll send a reset link to the email on your ledger—if the account exists.',
    Art: LoginStoryArt,
  },
  reset: {
    title: 'Choose a new key.',
    lede: 'Set a new password and return to your private ledger.',
    Art: LoginStoryArt,
  },
  register: {
    title: 'Open a private account.',
    lede: 'No noise. A clear path from intention to saved capital—goals, allocations, and a ledger that stays yours.',
    Art: RegisterStoryArt,
  },
};

/**
 * Full-bleed auth shell.
 * Login: equal split panels. Register: navy runs full length; form sits in a soft cream card.
 */
function AuthStoryPanel({ variant = 'login', children }) {
  const story = STORIES[variant] || STORIES.login;
  const Art = story.Art;
  const isRegister = variant === 'register';

  if (isRegister) {
    return (
      <div className="auth-shell auth-shell--register relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-primary-dark">
        <div className="auth-story-glow pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto grid h-full w-full max-w-[1500px] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)]">
          <aside className="auth-story relative hidden min-h-0 flex-col px-8 py-6 text-cream sm:px-10 lg:flex lg:px-10 lg:py-7 xl:px-12">
            <header className="relative z-10 shrink-0">
              <p className="font-engraved text-[1.65rem] text-gold xl:text-[1.9rem]">QUANT</p>
              <p className="mt-1.5 font-sans text-[11px] font-normal uppercase tracking-[0.2em] text-cream/40">
                Private Savings Intelligence
              </p>
            </header>

            <div className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col">
              <div className="max-w-lg shrink-0">
                <h1 className="font-serif text-[1.55rem] font-light leading-[1.15] tracking-[-0.02em] text-cream xl:text-[1.85rem]">
                  {story.title}
                </h1>
                <p className="mt-2 max-w-md font-sans text-[13px] font-light leading-relaxed text-cream/50">
                  {story.lede}
                </p>
              </div>

              <div className="auth-register-art-stage relative mt-2 flex min-h-0 flex-1 items-center justify-center lg:justify-start">
                <div className="auth-register-art-glow pointer-events-none absolute inset-0" aria-hidden="true" />
                <Art className="auth-story-illustration--register-fit relative z-10 w-full" />
              </div>
            </div>
          </aside>

          <section className="relative flex min-h-0 items-center justify-center overflow-hidden px-4 py-6 sm:px-6 lg:-ml-6 lg:justify-start lg:px-2 lg:py-8 xl:-ml-10 xl:px-4">
            <div className="auth-register-card relative w-full max-w-[440px] rounded-[1rem] px-6 py-6 sm:px-8 sm:py-7 lg:rounded-[1.15rem] lg:px-9 lg:py-8">
              <div className="relative z-10">{children}</div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell relative min-h-screen w-full lg:grid lg:grid-cols-2">
      <aside className="auth-story relative flex flex-col justify-between overflow-hidden bg-primary-dark px-8 py-10 text-cream sm:px-12 lg:min-h-screen lg:px-16 lg:py-14 xl:px-20">
        <div className="auth-story-glow pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10">
          <p className="font-engraved text-[2rem] text-gold sm:text-4xl">QUANT</p>
          <p className="mt-2.5 font-sans text-xs font-normal uppercase tracking-[0.18em] text-cream/40">
            Private Savings Intelligence
          </p>
        </div>

        <div className="relative z-10 my-8 flex flex-1 flex-col justify-center lg:my-0">
          <h1 className="max-w-md font-serif text-[2rem] font-light leading-[1.2] tracking-[-0.02em] text-cream sm:text-[2.5rem]">
            {story.title}
          </h1>
          <p className="mt-4 max-w-sm font-sans text-[15px] font-light leading-relaxed text-cream/55">
            {story.lede}
          </p>

          <div className="mt-8 hidden sm:block">
            <Art className="mx-auto h-auto w-full max-w-[300px] lg:mx-0 lg:max-w-[340px]" />
          </div>
        </div>
      </aside>

      <div
        className="auth-gold-divider pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden -translate-x-1/2 lg:block"
        aria-hidden="true"
      />

      <section className="auth-form-panel auth-form-panel--cream relative flex min-h-0 flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:min-h-screen lg:px-14 lg:py-14 xl:px-20">
        <div className="relative z-10 w-full max-w-[400px]">{children}</div>
      </section>
    </div>
  );
}

export default AuthStoryPanel;
