'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const catalogPath = '/products';
const millisecondsPerSlide = 5000;
const scrollIdleDelay = 300;

export function HomeSlideshow({ slides }) {
  const router = useRouter();
  const track = useRef(null);
  const navigationTimer = useRef(null);
  const interactionTimer = useRef(null);
  const holding = useRef(false);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [litSlide, setLitSlide] = useState(null);
  const running = !reducedMotion && !focused && !interacting && litSlide === null;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    function applyPreference() {
      setReducedMotion(preference.matches);
    }
    applyPreference();
    preference.addEventListener('change', applyPreference);
    return () => {
      preference.removeEventListener('change', applyPreference);
      window.clearTimeout(navigationTimer.current);
      window.clearTimeout(interactionTimer.current);
    };
  }, []);

  const scrollToSlide = useCallback((index, instant = false) => {
    const viewport = track.current;
    if (!viewport) return;
    viewport.scrollTo({ left: -index * viewport.clientWidth, behavior: instant || reducedMotion ? 'auto' : 'smooth' });
  }, [reducedMotion]);

  useEffect(() => {
    const viewport = track.current;
    if (!running || !viewport) return;
    const timer = window.setInterval(() => {
      const { clientWidth, scrollLeft } = viewport;
      if (!clientWidth || document.hidden) return;
      const index = Math.round(Math.max(0, -scrollLeft) / clientWidth);
      if (index < slides.length) scrollToSlide(index + 1);
    }, millisecondsPerSlide);
    return () => window.clearInterval(timer);
  }, [running, slides.length, scrollToSlide]);

  function resumeAfterIdle() {
    window.clearTimeout(interactionTimer.current);
    interactionTimer.current = window.setTimeout(() => setInteracting(false), scrollIdleDelay);
  }

  function holdCarousel() {
    holding.current = true;
    window.clearTimeout(interactionTimer.current);
    setInteracting(true);
  }

  function releaseCarousel() {
    if (!holding.current) return;
    holding.current = false;
    resumeAfterIdle();
  }

  function openCatalog(event, index) {
    if (reducedMotion && navigationTimer.current === null) return;
    event.preventDefault();
    if (navigationTimer.current !== null) return;
    setLitSlide(index);
    navigationTimer.current = window.setTimeout(() => {
      navigationTimer.current = null;
      setLitSlide(null);
      router.push(catalogPath);
    }, 150);
  }

  return <section className="home-slideshow" aria-label="Foto kampanye Hossler Studios">
    <div className="home-slide-track" ref={track} dir="rtl" tabIndex={0} aria-label="Geser untuk melihat foto berikutnya"
      onTouchStart={holdCarousel} onTouchEnd={releaseCarousel} onTouchCancel={releaseCarousel}
      onPointerDown={(event) => { if (event.pointerType !== 'touch') holdCarousel(); }}
      onPointerUp={(event) => { if (event.pointerType !== 'touch') releaseCarousel(); }}
      onPointerCancel={(event) => { if (event.pointerType !== 'touch') releaseCarousel(); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') releaseCarousel(); }}
      onWheel={(event) => {
        if (!event.deltaX && !event.shiftKey) return;
        setInteracting(true);
        if (!holding.current) resumeAfterIdle();
      }}
      onFocus={(event) => setFocused(event.target.matches(':focus-visible'))}
      onBlur={() => setFocused(false)}
      onScroll={(event) => {
        const { clientWidth, scrollLeft } = event.currentTarget;
        if (!clientWidth) return;
        const offset = Math.max(0, -scrollLeft);
        if (interacting && !holding.current) resumeAfterIdle();
        if (offset >= slides.length * clientWidth - 1) {
          scrollToSlide(0, true);
          setActive(0);
          return;
        }
        const index = Math.min(slides.length, Math.round(offset / clientWidth));
        if (index !== active) setActive(index);
      }}
      onKeyDown={(event) => {
        const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
        if (!step) return;
        event.preventDefault();
        setFocused(true);
        event.currentTarget.focus({ preventScroll: true });
        if (active === slides.length && step === 1) scrollToSlide(0, true);
        const next = active % slides.length + step;
        scrollToSlide(next < 0 ? slides.length - 1 : next);
      }}>
      {/* Repeat the first frame so the wrap can move in the same direction as the other transitions. */}
      {[...slides, slides[0]].map(({ src, mobile, alt }, index) => <figure className="home-slide" key={index} aria-hidden={index !== active}>
        <img className="home-slide-backdrop" src={mobile ?? src} alt="" loading="lazy"/>
        <Link className="home-slide-link" href={catalogPath} aria-label="Shop here, lihat semua produk"
          tabIndex={index === active ? 0 : -1} draggable={false} onNavigate={(event) => openCatalog(event, index)}>
          <img className="home-slide-photo" src={src} alt={alt} draggable={false}
            srcSet={mobile ? mobile + ' 768w, ' + src + ' 1440w' : undefined}
            sizes={mobile ? '(max-width: 620px) 100vw, 660px' : undefined}
            loading={index ? 'lazy' : 'eager'} fetchPriority={index ? undefined : 'high'}
            width={mobile ? 1440 : undefined} height={mobile ? 1920 : undefined} />
          <span className="home-slide-cta" data-lit={litSlide === index || undefined}>SHOP HERE</span>
        </Link>
      </figure>)}
    </div>
  </section>;
}
