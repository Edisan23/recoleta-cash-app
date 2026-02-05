'use client';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#e11d48' }}>¡Sistema en recuperación!</h2>
      <p>Estamos estabilizando las URLs de Firebase y GitHub.</p>
      <button onClick={() => reset()} style={{ marginTop: '10px', padding: '10px 20px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        Reintentar conexión
      </button>
    </div>
  );
}
