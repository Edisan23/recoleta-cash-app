'use client';

export default function HomePage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold text-blue-600">TurnosPro</h1>
      <p className="text-gray-600 mt-2">La base de la app está funcionando.</p>
      <div className="mt-4 p-4 bg-white shadow rounded">
        <p>Estado: 🟢 Sistema en línea</p>
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
      >
        Refrescar App
      </button>
    </div>
  );
}