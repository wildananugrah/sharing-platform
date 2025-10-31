'use client';

import { Header } from './Header';

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const handleRoomCreated = () => {
    // Dispatch a custom event that the home page will listen to
    window.dispatchEvent(new CustomEvent('roomCreated'));
  };

  return (
    <>
      <Header onRoomCreated={handleRoomCreated} />
      {children}
    </>
  );
}
