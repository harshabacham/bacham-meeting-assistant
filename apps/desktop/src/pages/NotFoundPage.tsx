import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[100svh] w-full bg-[var(--bg)] overflow-x-hidden flex items-center justify-center font-sans text-[var(--text-primary)]">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260801_001207_ec20d138-aa45-4b2b-ab8c-bdc71607f240.mp4" type="video/mp4" />
      </video>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/70 to-transparent" />

      {/* 404 Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        <h1 
          className="text-[120px] md:text-[160px] leading-none font-extrabold tracking-tighter uppercase font-sans mb-2"
          style={{
            WebkitTextStroke: '2px rgba(255, 255, 255, 0.7)',
            color: 'transparent',
            backgroundImage: 'linear-gradient(135deg, var(--accent) 0%, rgba(139, 92, 246, 0.8) 100%)',
            WebkitBackgroundClip: 'text'
          }}
        >
          404
        </h1>

        <p className="text-base font-bold text-[var(--text-primary)] mb-2">
          Page Not Found
        </p>
        <p className="text-xs text-[var(--text-muted)] mb-8">
          The item or page you are looking for does not exist or has been moved.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={14} /> Go Back
          </button>
          <button
            onClick={() => navigate('/notes')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 text-xs font-bold transition-opacity"
          >
            <Home size={14} /> Return to Notes
          </button>
        </div>
      </div>
    </div>
  );
}
