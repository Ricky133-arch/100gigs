'use client';
import { useState, useEffect } from 'react';
import SplashScreen from './SplashScreen';
import Onboarding from './Onboarding';

export default function AppEntry({ children }) {
  const [phase, setPhase] = useState('splash'); // 'splash' | 'onboarding' | 'app'

  const handleSplashComplete = () => {
    const seen = localStorage.getItem('100gigs_onboarded');
    setPhase(seen ? 'app' : 'onboarding');
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('100gigs_onboarded', 'true');
    setPhase('app');
  };

  return (
    <>
      {phase === 'splash' && <SplashScreen onComplete={handleSplashComplete} />}
      {phase === 'onboarding' && <Onboarding onComplete={handleOnboardingComplete} />}
      {/* Always render children so the app is ready underneath */}
      <div style={{ visibility: phase === 'app' ? 'visible' : 'hidden' }}>
        {children}
      </div>
    </>
  );
}