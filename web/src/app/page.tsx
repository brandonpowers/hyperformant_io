'use client';
import { Navigation } from 'components/marketing/Navigation';
import TemplateFooter from 'components/marketing/TemplateFooter';
import Hero from 'components/marketing/Hero';
import LogoCloud from 'components/marketing/LogoCloud';
import { GlobalDatabase } from 'components/marketing/GlobalDatabase';
import Features from 'components/marketing/Features';
import Pricing from 'components/marketing/Pricing';
import Cta from 'components/marketing/Cta';
import '../styles/marketing.css';

export default function Home() {
  return (
    <>
      <Navigation />
      <main className="flex flex-col overflow-hidden">
        <Hero />
        <LogoCloud />
        <GlobalDatabase />
        <Features />
        <Pricing />
        <Cta />
      </main>
      <TemplateFooter />
    </>
  );
}