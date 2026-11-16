const root = document.documentElement;

const viewportRevealRefreshers = [];
function createViewportBandObserver(callback) {
  const targets = new Set();
  let observer;
  function refresh() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(callback, {
      rootMargin: `-${Math.round(innerHeight * .75)}px 0px -${Math.round(innerHeight * .17)}px 0px`,
      threshold: .05
    });
    targets.forEach(target => observer.observe(target));
  }
  refresh();
  viewportRevealRefreshers.push(refresh);
  return { observe(target) { targets.add(target); observer.observe(target); } };
}
let viewportResizeFrame = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(viewportResizeFrame);
  viewportResizeFrame = requestAnimationFrame(() => viewportRevealRefreshers.forEach(refresh => refresh()));
}, { passive: true });

// Keep animation timelines intact while avoiding work outside the viewport.
const motionSections = [...document.querySelectorAll('.page-shell, section[id]')];
if ('IntersectionObserver' in window) {
  const motionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('motion-offscreen', !entry.isIntersecting));
  }, { rootMargin: '100px 0px' });
  motionSections.forEach(section => motionObserver.observe(section));
}
const heroVideo = document.querySelector('.bg-video');
let heroOnScreen = true;
function syncHeroVideo() {
  if (!heroVideo) return;
  if (!heroOnScreen || document.hidden) heroVideo.pause();
  else heroVideo.play().catch(() => {}); // Autoplay may be blocked by iOS power-saving mode.
}
if ('IntersectionObserver' in window && heroVideo) {
  new IntersectionObserver(entries => {
    heroOnScreen = entries[0].isIntersecting;
    syncHeroVideo();
  }).observe(document.querySelector('.page-shell'));
}
function syncDocumentVisibility() {
  root.classList.toggle('document-hidden', document.hidden);
  syncHeroVideo();
}
document.addEventListener('visibilitychange', syncDocumentVisibility);

const journey = document.querySelector('.ribbon-journey');
if (journey) {
  const art = journey.querySelector('.journey-ribbon');
  art.style.height = '1px';
  art.style.visibility = 'hidden';
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileRibbon = window.matchMedia('(max-width: 650px), (max-width: 980px) and (pointer: coarse)');
  const strands = Array.from({ length: 36 }, (_, index) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.style.strokeWidth = index === 0 || index === 35 ? '1.8' : '.75';
    art.append(path);
    return { path, lane: index / 35 * 2 - 1 };
  });
  let journeyTop = 0;
  let journeyHeight = 1;
  let journeySplit = 1;
  let journeyFrame = 0;
  let lastJourneyPaint = 0;
  let journeyVisible = false;
  let journeyViewportKey = '';
  function measureJourney() {
    const bounds = journey.getBoundingClientRect();
    journeyTop = bounds.top + window.scrollY;
    journeyHeight = Math.max(1, bounds.height);
    const finalSection = journey.querySelector('.project-collection').getBoundingClientRect();
    journeySplit = finalSection.top - bounds.top + finalSection.height * .75;
  }
  function paintJourney(time) {
    const thickness = mobileRibbon.matches ? 1.55 : 1;
    const start = Math.max(0, Math.floor((window.scrollY - journeyTop - 220) / 28) * 28);
    const end = Math.min(journeyHeight, window.scrollY - journeyTop + window.innerHeight + 250);
    // Keep the filtered SVG surface near the viewport instead of allocating one
    // composited layer as tall as the entire portfolio journey.
    const visibleHeight = Math.max(1, end - start + 28);
    const viewportKey = `${start}:${visibleHeight}:${journeyHeight}`;
    if (viewportKey !== journeyViewportKey) {
    journeyViewportKey = viewportKey;
    art.style.top = `${start}px`;
    art.style.height = `${visibleHeight}px`;
    art.setAttribute('viewBox', `0 ${start} 1000 ${visibleHeight}`);
    art.style.maskImage = `linear-gradient(transparent, #000 ${start === 0 ? 90 : 0}px, #000 calc(100% - ${end >= journeyHeight ? 45 : 0}px), transparent)`;
    }
    const samples = [];
    for (let y = start; y <= Math.min(journeyHeight, end + 28); y += 28) {
      const phase = y / 550 - time * .6;
      const fork = Math.max(0, Math.min(1, (y - journeySplit) / Math.max(1, journeyHeight - journeySplit)));
      samples.push({ y, center: 500 + Math.sin(y / 900 - time * .12) * 8, width: (27 + Math.cos(phase) * 9) * thickness, depth: Math.sin(phase) * 17 * (1 - fork) * thickness, spread: 560 * fork * fork });
    }
    strands.forEach(({ path, lane }) => {
      const laneDepth = Math.sqrt(Math.max(0, 1 - lane * lane));
      const points = samples.map((sample, index) => {
        const x = sample.center + lane * sample.width + laneDepth * sample.depth + (lane < 0 ? -sample.spread : sample.spread);
        return `${index ? 'L' : 'M'}${x.toFixed(2)},${sample.y}`;
      });
      path.setAttribute('d', points.join(' '));
      const light = .5 + lane * Math.sin((start + end) / 1100 - time * .6) * .5;
      path.style.stroke = `hsl(42, ${80 + light * 13}%, ${32 + light * 48}%)`;
      path.style.opacity = String(.32 + light * .48);
    });
  }
  function animateJourney(now) {
    journeyFrame = 0;
    if (!journeyVisible || document.hidden) return;
    if (now - lastJourneyPaint > 32 || preference.matches) {
      paintJourney(preference.matches ? 0 : now / 1000);
      lastJourneyPaint = now;
    }
    if (!preference.matches) journeyFrame = requestAnimationFrame(animateJourney);
  }
  function syncJourney() {
    if (journeyVisible && !document.hidden && !journeyFrame) journeyFrame = requestAnimationFrame(animateJourney);
  }
  function syncRibbonThickness() {
    strands.forEach(({ path }, index) => {
      const base = index === 0 || index === 35 ? 1.8 : .75;
      path.style.strokeWidth = String(base * (mobileRibbon.matches ? 1.35 : 1));
    });
    syncJourney();
  }
  syncRibbonThickness();
  mobileRibbon.addEventListener('change', syncRibbonThickness);
  measureJourney();
  if ('ResizeObserver' in window) new ResizeObserver(() => { measureJourney(); syncJourney(); }).observe(journey);
  else window.addEventListener('resize', () => { measureJourney(); syncJourney(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { journeyVisible = entries[0].isIntersecting; art.style.visibility = journeyVisible ? 'visible' : 'hidden'; syncJourney(); }).observe(journey);
  else { journeyVisible = true; syncJourney(); }
  window.addEventListener('scroll', syncJourney, { passive: true });
  document.addEventListener('visibilitychange', syncJourney);
  preference.addEventListener('change', syncJourney);
}

const aboutSection = document.querySelector('.about-ascend');
if (aboutSection) {
  const aboutCopy = aboutSection.querySelector('.about-copy');
  if ('IntersectionObserver' in window) {
    aboutCopy.classList.add('about-copy-ready');
    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
        else if (entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top >= window.innerHeight) {
          entry.target.classList.remove('is-visible');
        }
      });
    }, { threshold: .12 }).observe(aboutCopy);
  }
  const chart = aboutSection.querySelector('.about-live-chart');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let aboutVisible = false;
  function syncAboutAnimation() {
    const animate = aboutVisible && !document.hidden && !motionPreference.matches;
    aboutSection.classList.toggle('is-in-view', animate);
    if (animate) chart.unpauseAnimations();
    else chart.pauseAnimations();
    if (motionPreference.matches) {
      const motion = chart.querySelector('animateMotion');
      motion.setAttribute('keyPoints', '1;1;1');
    } else chart.querySelector('animateMotion').setAttribute('keyPoints', '0;1;1');
  }
  chart.pauseAnimations();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      aboutVisible = entries[0].isIntersecting;
      syncAboutAnimation();
    }, { threshold: .08 }).observe(aboutSection);
  } else { aboutVisible = true; syncAboutAnimation(); }
  document.addEventListener('visibilitychange', syncAboutAnimation);
  motionPreference.addEventListener('change', syncAboutAnimation);
}

const collection = document.querySelector('.project-collection');
if (collection) {
  const cards = [...collection.querySelectorAll('.collection-card')];
  if ('IntersectionObserver' in window) {
    collection.classList.add('collection-ready');
    const cardObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-open');
        else if (entry.boundingClientRect.bottom < 0 || entry.boundingClientRect.top > window.innerHeight) {
          entry.target.classList.remove('is-open');
        }
      });
    }, { threshold: .12 });
    cards.forEach(card => cardObserver.observe(card));
  } else {
    cards.forEach(card => card.classList.add('is-open'));
  }

  const previewDialog = document.querySelector('.collection-dialog');
  const previewImage = previewDialog.querySelector('.collection-dialog-image');
  collection.querySelectorAll('.collection-preview').forEach(button => {
    button.addEventListener('click', () => {
      const card = button.closest('.collection-card');
      const image = card.querySelector('img');
      previewDialog.querySelector('h2').textContent = card.querySelector('h2').textContent;
      previewImage.src = image.src;
      previewImage.alt = image.alt;
      previewDialog.showModal();
    });
  });
  previewDialog.querySelector('.collection-dialog-close').addEventListener('click', () => previewDialog.close());
  previewDialog.addEventListener('click', event => {
    if (event.target === previewDialog) {
      const bounds = previewDialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) previewDialog.close();
    }
  });
}
const heroVisual = document.querySelector('.hero-visual');
const brandPanel = document.querySelector('.brand-panel');

if (heroVisual && brandPanel && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let heroPointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  const heroMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  window.addEventListener('pointermove', (event) => {
    if (!heroOnScreen || document.hidden || heroMotionPreference.matches) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (heroPointerFrame) return;
    heroPointerFrame = requestAnimationFrame(() => {
    heroPointerFrame = 0;
    const x = (pointerX / window.innerWidth - 0.5) * 2;
    const y = (pointerY / window.innerHeight - 0.5) * 2;

    root.style.setProperty('--pointer-x', x.toFixed(3));
    root.style.setProperty('--pointer-y', y.toFixed(3));

    const rotateY = x * 10;
    const rotateX = -y * 8;

    brandPanel.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(0, 0, 0)`;
    heroVisual.style.transform = `rotateX(${rotateX * 0.18}deg) rotateY(${rotateY * 0.16}deg)`;
    });
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    cancelAnimationFrame(heroPointerFrame);
    heroPointerFrame = 0;
    brandPanel.style.transform = 'rotateX(10deg) rotateY(-16deg) translate3d(0, 0, 0)';
    heroVisual.style.transform = 'none';
  });
}

const featureSection = document.querySelector('.feature-section');

if (featureSection && 'IntersectionObserver' in window) {
  featureSection.classList.add('reveal-ready');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          entry.target.classList.remove('is-in-view');
        }
      }
    },
    { rootMargin: '-24% 0px -24% 0px', threshold: 0.01 }
  );

  sectionObserver.observe(featureSection);

  const firstFeatureCard = featureSection.querySelector('.feature-card');
  const cardObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        cardObserver.unobserve(entry.target);

        if (entry.target === firstFeatureCard && entry.isIntersecting) {
          featureSection.classList.add('is-in-view');
        }
      }
    },
    { rootMargin: '-16% 0px -16% 0px', threshold: 0.12 }
  );

  featureSection.querySelectorAll('.feature-card').forEach((card) => {
    cardObserver.observe(card);
  });
} else if (featureSection) {
  featureSection.classList.add('is-in-view');
  featureSection.querySelectorAll('.feature-card').forEach((card) => {
    card.classList.add('is-visible');
  });
}

document.querySelectorAll('.projects-section').forEach((projectsSection) => {
  const projectsVisuals = Array.from(projectsSection.querySelectorAll('.projects-visual'));
  if (!projectsVisuals.length) return;

  if ('IntersectionObserver' in window) {
    projectsSection.classList.add('reveal-ready');
    const projectsObserver = createViewportBandObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          entry.target.classList.add('is-in-view');
          projectsSection.classList.add('is-in-view');
        }
      }
    );

    const projectsExitObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            entry.target.classList.remove('is-in-view');
          }
        }
      },
      { threshold: 0 }
    );

    projectsVisuals.forEach((visual) => {
      projectsObserver.observe(visual);
      projectsExitObserver.observe(visual);
    });
  } else {
    projectsSection.classList.add('is-in-view');
    projectsVisuals.forEach((visual) => visual.classList.add('is-in-view'));
  }
});

const portfolioShowcase = document.querySelector('.portfolio-showcase');
if (portfolioShowcase && 'IntersectionObserver' in window) {
  const portfolioHeading = portfolioShowcase.querySelector('.portfolio-heading');
  portfolioHeading.classList.add('portfolio-heading-ready');
  new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
      else if (entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top >= window.innerHeight) {
        entry.target.classList.remove('is-visible');
      }
    });
  }, { threshold: .12 }).observe(portfolioHeading);
}

// Continuous ribbons share the same shape, depth, lighting and animation clock.
document.querySelectorAll('.portfolio-showcase, .services-section, .maintenance-section, .connected-section').forEach(ribbonSection => {
  if (ribbonSection.closest('.ribbon-journey')) return;
  const art = ribbonSection.querySelector('.portfolio-wave-art, .services-ribbon, .maintenance-ribbon, .platform-ribbon');
  const joinsServices = ribbonSection.classList.contains('maintenance-section');
  const connectedSection = ribbonSection.classList.contains('connected-section');
  const servicesRibbon = ribbonSection.classList.contains('services-section');
  const precedingServices = joinsServices ? document.querySelector('.services-section') : connectedSection ? ribbonSection.previousElementSibling : null;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  art.setAttribute('viewBox', '0 0 1000 1000');
  art.querySelectorAll('g').forEach(group => group.remove());
  const ribbons = Array.from({ length: joinsServices || connectedSection || servicesRibbon ? 2 : 4 }, (_, corner) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    art.append(group);
    return Array.from({ length: 36 }, (_, index) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.style.strokeWidth = index === 0 || index === 35 ? '2' : '.85';
      path.style.opacity = index === 0 || index === 35 ? '.95' : '.42';
      group.append(path);
      return { path, lane: index / 35 * 2 - 1, corner };
    });
  }).flat();
  function paintPortfolioRibbons(time) {
    const joinScale = precedingServices ? precedingServices.clientHeight / Math.max(1, ribbonSection.clientHeight) : 1;
    const sharedSamples = Array.from({ length: 65 }, (_, step) => {
      const t = step / 64;
      const phase = t * Math.PI * 2 - time * .65;
      const roll = Math.sin(phase);
      return { t, roll, width: 22 + Math.cos(phase) * 10, depth: roll * 16, center: 35 - Math.sin(t * Math.PI) * 100 + Math.sin(phase * .8) * 15 };
    });
    ribbons.forEach(({ path, lane, corner }) => {
      const right = corner % 2;
      const bottom = joinsServices || connectedSection || servicesRibbon ? corner === 1 : corner > 1;
      const phaseCorner = joinsServices && !bottom ? corner + 2 : corner;
      const laneDepth = Math.sqrt(Math.max(0, 1 - lane * lane));
      const points = [];
      for (let step = 0; step <= 64; step++) {
        const t = step / 64;
        if (joinsServices || connectedSection || servicesRibbon) {
          const sample = sharedSamples[step];
          const curveY = sample.center + lane * sample.width + laneDepth * sample.depth;
          const flowX = -30 + t * 1060;
          const flowY = !bottom ? -curveY * joinScale : 1000 - curveY;
          points.push(`${step ? 'L' : 'M'}${flowX.toFixed(2)},${flowY.toFixed(2)}`);
          if (step === 32) {
            const light = Math.max(0, Math.min(1, .5 + lane * sample.roll * .5));
            path.style.stroke = `hsl(42, ${78 + light * 15}%, ${30 + light * 52}%)`;
            path.style.opacity = String(.3 + light * .5);
          }
          continue;
        }
        const phase = t * 7 - time * .6 + phaseCorner * .9;
        const serviceBottom = bottom && ribbonSection.classList.contains('services-section');
        const travel = serviceBottom ? 420 : right && bottom ? 480 : 580;
        const x = right ? 1030 - t * travel : -30 + t * travel;
        const envelope = 1 - t * .6;
        const center = 48 + Math.sin(t * Math.PI) * 30 - 115 * t;
        const twist = Math.cos(phase) * 32 * envelope;
        const ripple = Math.sin(phase * .7) * 16 * envelope;
        const y = center + ripple + lane * twist;
        const joinedY = bottom ? 1000 - y : y;
        points.push(`${step ? 'L' : 'M'}${x.toFixed(2)},${joinedY.toFixed(2)}`);
      }
      path.setAttribute('d', points.join(' '));
    });
  }
  let edgeFrame = 0;
  let edgeLastPaint = 0;
  let edgesVisible = false;
  function animatePortfolioRibbons(now) {
    if (!edgesVisible || document.hidden || motionPreference.matches) {
      edgeFrame = 0;
      return;
    }
    if (now - edgeLastPaint > 32) {
      paintPortfolioRibbons(now / 1000);
      edgeLastPaint = now;
    }
    edgeFrame = requestAnimationFrame(animatePortfolioRibbons);
  }
  function syncPortfolioRibbons() {
    if (edgesVisible && !document.hidden && !motionPreference.matches && !edgeFrame) {
      edgeFrame = requestAnimationFrame(animatePortfolioRibbons);
    }
  }
  paintPortfolioRibbons(0);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      edgesVisible = entries[0].isIntersecting;
      syncPortfolioRibbons();
    }).observe(ribbonSection);
  } else {
    edgesVisible = true;
    syncPortfolioRibbons();
  }
  document.addEventListener('visibilitychange', syncPortfolioRibbons);
  motionPreference.addEventListener('change', syncPortfolioRibbons);
});

const closingSection = document.querySelector('.closing-section');
if (closingSection) {
  if ('IntersectionObserver' in window) {
    closingSection.classList.add('closing-ready');
    new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-visible', entry.isIntersecting));
    }, { threshold: .12 }).observe(closingSection);
  } else closingSection.classList.add('is-visible');
}

document.querySelectorAll('.platform-section').forEach(section => {
  const heading = section.querySelector('.platform-heading');
  const cards = [...section.querySelectorAll('.platform-card')];
  if ('IntersectionObserver' in window) {
    section.classList.add('platform-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
        else if (entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top >= window.innerHeight) entry.target.classList.remove('is-visible');
      });
    }, { threshold: .12 });
    [heading, ...cards].forEach(element => observer.observe(element));
  } else [heading, ...cards].forEach(element => element.classList.add('is-visible'));
});

const maintenanceSection = document.querySelector('.maintenance-section');
if (maintenanceSection) {
  const elements = [...maintenanceSection.querySelectorAll('.maintenance-copy, .maintenance-plan')];
  if ('IntersectionObserver' in window) {
    maintenanceSection.classList.add('maintenance-ready');
    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
        else if (entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top >= window.innerHeight) entry.target.classList.remove('is-visible');
      });
    }, { threshold: .12 }).observe(elements[0]);
    const planObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-visible', entry.isIntersecting));
    }, { threshold: .12 });
    planObserver.observe(elements[1]);
  } else elements.forEach(element => element.classList.add('is-visible'));
}

const servicesSection = document.querySelector('.services-section');
if (servicesSection) {
  const heading = servicesSection.querySelector('.services-heading');
  const cards = [...servicesSection.querySelectorAll('.service-card')];
  if ('IntersectionObserver' in window) {
    servicesSection.classList.add('services-ready');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
        else if (entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top >= window.innerHeight) {
          entry.target.classList.remove('is-visible');
        }
      });
    }, { threshold: .12 });
    [heading, ...cards].forEach(element => revealObserver.observe(element));
    new IntersectionObserver(entries => {
      servicesSection.classList.toggle('is-active', entries[0].isIntersecting && !document.hidden);
    }).observe(servicesSection);
    document.addEventListener('visibilitychange', () => {
      const bounds = servicesSection.getBoundingClientRect();
      servicesSection.classList.toggle('is-active', !document.hidden && bounds.bottom > 0 && bounds.top < window.innerHeight);
    });
  } else {
    servicesSection.classList.add('is-active');
    [heading, ...cards].forEach(element => element.classList.add('is-visible'));
  }
}

if (portfolioShowcase) {
  const portfolioCards = Array.from(portfolioShowcase.querySelectorAll('.portfolio-card'));
  portfolioShowcase.classList.add('reveal-ready');

  if ('IntersectionObserver' in window) {
    const showcaseObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle('is-in-view', entry.isIntersecting);
        }
      },
      { threshold: 0.01 }
    );

    const portfolioRevealObserver = createViewportBandObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in-view');
          }
        }
      }
    );
    const portfolioExitObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            entry.target.classList.remove('is-in-view');
          }
        }
      },
      { threshold: 0 }
    );

    showcaseObserver.observe(portfolioShowcase);
    portfolioCards.forEach((card) => {
      portfolioRevealObserver.observe(card);
      portfolioExitObserver.observe(card);
    });
  } else {
    portfolioShowcase.classList.add('is-in-view');
    portfolioCards.forEach((card) => card.classList.add('is-in-view'));
  }
}

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    card.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;

      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        const bounds = card.getBoundingClientRect();
        const x = (pointerX - bounds.left) / bounds.width;
        const y = (pointerY - bounds.top) / bounds.height;
        const rotateX = (0.5 - y) * 8;
        const rotateY = (x - 0.5) * 10;

        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
      });
    });

    card.addEventListener('pointerleave', () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      card.style.transform = '';
    });
  });
}
