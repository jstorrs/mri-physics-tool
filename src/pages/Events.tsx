import { useNavigate } from 'react-router-dom';

export default function Events() {
  const navigate = useNavigate();

  return (
    <>
      <header className="drill-header">
        <button className="drill-header__back" onClick={() => navigate('/')}>
          ‹
        </button>
        <h1 className="drill-header__title">Events</h1>
      </header>

      <div style={{ padding: 'var(--space-4)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Events page - to be rebuilt.
        </p>
        <p style={{ marginTop: 'var(--space-4)' }}>
          This page will show service events (ACR tests, QC checks, repairs, etc.)
        </p>
      </div>
    </>
  );
}
