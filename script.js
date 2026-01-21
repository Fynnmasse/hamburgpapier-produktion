// Inhalt aus script.js
const prefersReducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const prepareShadowText = (target) => {
    if (!target || target.dataset.shadowReady === 'true') return;
    const rawText = target.textContent;
    if (!rawText || !rawText.trim()) return;

    target.dataset.shadowReady = 'true';
    const words = rawText.trim().split(/\s+/);
    const fragment = document.createDocumentFragment();
    let delayIndex = 0;

    words.forEach((word, index) => {
        const segments = word.split(/(-)/).filter(Boolean);
        segments.forEach((segment) => {
            const span = document.createElement('span');
            span.textContent = segment;
            span.setAttribute('data-text', segment);
            delayIndex += 1;
            span.style.setProperty('--shadow-delay', `${delayIndex * 0.08}s`);
            fragment.appendChild(span);
        });
        if (index < words.length - 1) {
            fragment.appendChild(document.createTextNode(' '));
        }
    });

    target.textContent = '';
    target.appendChild(fragment);
};

const triggerShadowAnimation = (target) => {
    if (!target || prefersReducedMotion) return;
    prepareShadowText(target);
    if (target.dataset.shadowReady !== 'true') return;
    target.classList.remove('is-shadow-animated');
    if (target._shadowRafId) cancelAnimationFrame(target._shadowRafId);
    target._shadowRafId = requestAnimationFrame(() => {
        target.classList.add('is-shadow-animated');
        target._shadowRafId = null;
    });
};

const scheduleShadowAnimation = (target) => {
    if (!target || prefersReducedMotion) return;
    if (target._shadowIdleId) {
        if (target._shadowIdleType === 'idle' && 'cancelIdleCallback' in window) {
            cancelIdleCallback(target._shadowIdleId);
        } else {
            clearTimeout(target._shadowIdleId);
        }
    }
    const start = () => {
        target._shadowIdleId = null;
        triggerShadowAnimation(target);
    };
    if ('requestIdleCallback' in window) {
        target._shadowIdleType = 'idle';
        target._shadowIdleId = requestIdleCallback(start, { timeout: 250 });
    } else {
        target._shadowIdleType = 'timeout';
        target._shadowIdleId = setTimeout(start, 120);
    }
};

const getShadowAnimationDuration = (target) => {
    if (!target || prefersReducedMotion) return 0;
    prepareShadowText(target);
    const spans = Array.from(target.querySelectorAll('span'));
    let maxDelay = 0;
    spans.forEach((span) => {
        const delayValue = span.style.getPropertyValue('--shadow-delay');
        const delay = delayValue ? parseFloat(delayValue) : 0;
        if (!Number.isNaN(delay) && delay > maxDelay) maxDelay = delay;
    });
    return maxDelay + 0.82;
};
if (window.gsap) {
    gsap.registerPlugin(ScrollTrigger);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const preloader = document.getElementById('preloader');
    const progressFill = document.querySelector('.preloader__progress-fill');
    const percentLabel = document.querySelector('.preloader__percent');
    const ring = document.querySelector('.preloader__ring');
    const preloaderState = { value: 0 };
    let introPlayed = false;
    let introQueued = false;
    const heroVideo = document.querySelector('.hero video');
    const heroContent = document.querySelector('.hero__content');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const introEase = prefersReduced ? 'power1.out' : 'power3.out';
    const introDurations = {
        video: prefersReduced ? 0.4 : 2.2,
        content: prefersReduced ? 0.4 : 1.4,
        subtitle: prefersReduced ? 0.35 : 1.1
    };

    if (heroVideo) {
        gsap.set(heroVideo, {
            autoAlpha: 0,
            scale: 1.06,
            filter: 'saturate(1.05)',
            transformOrigin: '50% 50%',
            willChange: 'transform, opacity',
            force3D: true
        });
    }
    if (heroContent) {
        gsap.set(heroContent, {
            autoAlpha: 0,
            y: 36,
            willChange: 'transform, opacity',
            force3D: true
        });
    }

    const updateProgress = (value) => {
        if (!progressFill) return;
        const clamped = Math.min(100, Math.max(0, Math.round(value)));
        gsap.set(progressFill, { width: `${clamped}%` });
        if (percentLabel) percentLabel.textContent = `${clamped}%`;
    };

    const playIntro = () => {
        if (introPlayed) return;
        introPlayed = true;
        const introTl = gsap.timeline({ defaults: { ease: introEase } });
        if (heroVideo) {
            introTl.to(heroVideo, { autoAlpha: 1, scale: 1, duration: introDurations.video }, 0);
        }
        if (heroContent) {
            introTl.to(heroContent, { autoAlpha: 1, y: 0, duration: introDurations.content }, prefersReduced ? 0 : 0.45);
        }
        if (heroSubtitle) {
            introTl.from(heroSubtitle, { autoAlpha: 0, y: 16, duration: introDurations.subtitle }, prefersReduced ? 0.1 : 0.6);
        }
    };

    const startIntro = () => {
        if (introPlayed || introQueued) return;
        if (!heroVideo || prefersReduced) {
            playIntro();
            return;
        }
        if (heroVideo.readyState >= 2) {
            playIntro();
            return;
        }
        introQueued = true;
        let fallbackId = 0;
        const handleReady = () => {
            if (fallbackId) clearTimeout(fallbackId);
            introQueued = false;
            playIntro();
        };
        fallbackId = window.setTimeout(handleReady, 1200);
        heroVideo.addEventListener('loadeddata', handleReady, { once: true });
    };

    if (preloader) {
        updateProgress(0);
        gsap.from('.preloader__badge', { scale: 0.94, autoAlpha: 0, duration: prefersReduced ? 0.4 : 1.1, ease: 'power3.out' });
        gsap.from('.preloader__label', { autoAlpha: 0, y: 12, duration: prefersReduced ? 0.35 : 1, ease: 'power2.out', delay: 0.3 });
        if (!prefersReduced && ring) gsap.to(ring, { rotate: 360, duration: 3.6, ease: 'power1.inOut', repeat: -1 });
        gsap.to(preloaderState, { value: 78, duration: prefersReduced ? 1.1 : 3.6, ease: 'power2.out', onUpdate: () => updateProgress(preloaderState.value) });

        const hidePreloader = () => {
            if (!preloader || preloader.classList.contains('is-hidden')) return;
            gsap.killTweensOf(preloaderState);
            gsap.to(preloaderState, { value: 100, duration: 3, ease: 'power1.inOut', onUpdate: () => updateProgress(preloaderState.value) });
            gsap.timeline({
                defaults: { ease: 'power2.out' },
                onComplete: () => {
                    preloader.classList.add('is-hidden');
                    document.body.classList.remove('is-preloading');
                    setTimeout(() => preloader.remove(), 700);
                    startIntro();
                }
            })
                .to('.preloader__badge', { y: prefersReduced ? 0 : -10, duration: prefersReduced ? 0.4 : 0.75 }, '-=0.2')
                .to(preloader, { autoAlpha: 0, duration: prefersReduced ? 0.5 : 0.95 }, '-=0.1');
        };

        window.addEventListener('load', hidePreloader);
        setTimeout(hidePreloader, 11000);
    } else {
        document.body.classList.remove('is-preloading');
        startIntro();
    }

    // Smooth scrolling with inertia (Luxy-like)
    (function () {
        const scroller = document.getElementById('smooth-scroll');
        if (!scroller) return;

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isTouchPrimary = window.matchMedia('(pointer: coarse)').matches;
        const lowPower = typeof navigator !== 'undefined' && 'deviceMemory' in navigator && navigator.deviceMemory <= 4;
        if (prefersReduced || isTouchPrimary || lowPower) return;

        document.body.classList.add('smooth-scroll-enabled');
        scroller.style.transform = 'translate3d(0, 0, 0)';

        let target = window.scrollY;
        let current = window.scrollY;
        const ease = 0.12;
        const hasScrollTrigger = typeof ScrollTrigger !== 'undefined';

        const setHeight = () => {
            const height = Math.max(scroller.scrollHeight, window.innerHeight);
            document.body.style.height = `${height}px`;
        };
        setHeight();

        const resizeObserver = new ResizeObserver(setHeight);
        resizeObserver.observe(scroller);
        window.addEventListener('resize', setHeight);

        if (hasScrollTrigger) {
            ScrollTrigger.scrollerProxy(scroller, {
                scrollTop(value) {
                    if (arguments.length) {
                        window.scrollTo(0, value);
                    }
                    return current;
                },
                getBoundingClientRect() {
                    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
                },
                pinType: 'transform'
            });
            ScrollTrigger.defaults({ scroller });
            ScrollTrigger.addEventListener('refresh', setHeight);
            ScrollTrigger.refresh();
        }

        const raf = () => {
            target = window.scrollY;
            current += (target - current) * ease;
            if (Math.abs(target - current) < 0.1) current = target;
            scroller.style.transform = `translate3d(0, ${-current}px, 0)`;
            if (hasScrollTrigger) ScrollTrigger.update();
            requestAnimationFrame(raf);
        };
        raf();
    })();

    // Anchor navigation that respects the fixed smooth-scroll container
    const anchorLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');
    const scrollToHash = (hash) => {
        if (!hash || hash === '#') return;
        const targetId = hash.replace('#', '');
        const target = document.getElementById(targetId);
        if (!target) return;
        const targetY = window.scrollY + target.getBoundingClientRect().top;
        window.scrollTo({ top: targetY, behavior: prefersReduced ? 'auto' : 'smooth' });
    };
    anchorLinks.forEach((link) => {
        link.addEventListener('click', (evt) => {
            const href = link.getAttribute('href');
            if (!href) return;
            evt.preventDefault();
            scrollToHash(href);
            if (history && history.pushState) history.pushState(null, '', href);
        });
    });
    if (window.location.hash) {
        scrollToHash(window.location.hash);
    }

    if (heroVideo) {
        heroVideo.muted = true;
        heroVideo.setAttribute('playsinline', '');
        heroVideo.setAttribute('webkit-playsinline', '');
        if (!prefersReduced) {
            heroVideo.play().catch(() => {});
        } else {
            heroVideo.removeAttribute('autoplay');
            heroVideo.pause();
        }
    }

    const navToggle = document.querySelector('.nav-toggle');
    const menuOverlay = document.querySelector('.menu-overlay');
    if (navToggle && menuOverlay) {
        const items = gsap.utils.toArray('.menu-overlay__item');
        const title = menuOverlay.querySelector('.menu-overlay__title');
        const closeBtn = menuOverlay.querySelector('.menu-overlay__close');
        const overlayTimeline = gsap.timeline({
            paused: true,
            reversed: true,
            defaults: { ease: 'power3.inOut' }
        });

        overlayTimeline.set(menuOverlay, { autoAlpha: 1, pointerEvents: 'auto' });
        overlayTimeline.fromTo(menuOverlay, {
            opacity: 0
        }, {
            opacity: 1,
            duration: prefersReduced ? 0.15 : 0.35
        });
        overlayTimeline.from([title, ...items], {
            y: 24,
            autoAlpha: 0,
            stagger: 0.05,
            duration: prefersReduced ? 0.12 : 0.3
        }, '-=0.15');
        overlayTimeline.eventCallback('onReverseComplete', () => {
            menuOverlay.style.pointerEvents = 'none';
        });

        const lockScroll = (state) => document.body.classList.toggle('menu-open', state);
        const setToggleState = (open) => {
            navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            navToggle.classList.toggle('is-active', open);
            menuOverlay.setAttribute('aria-hidden', open ? 'false' : 'true');
        };
        const openMenu = () => {
            setToggleState(true);
            lockScroll(true);
            overlayTimeline.play();
        };
        const closeMenu = () => {
            setToggleState(false);
            lockScroll(false);
            overlayTimeline.reverse();
        };

        navToggle.addEventListener('click', () => {
            if (overlayTimeline.reversed()) {
                openMenu();
            } else {
                closeMenu();
            }
        });

        menuOverlay.addEventListener('click', (evt) => {
            if (evt.target === menuOverlay) closeMenu();
        });
        if (closeBtn) closeBtn.addEventListener('click', closeMenu);
        items.forEach((item) => item.addEventListener('click', closeMenu));
        document.addEventListener('keydown', (evt) => {
            if (evt.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu();
        });
    }

    // Hide nav on scroll down, show on scroll up
    const header = document.querySelector('header');
    let lastScrollY = window.scrollY;
    let scrollTicking = false;
    const hideThreshold = 120;
    const handleHeaderScroll = () => {
        if (!header) return;
        const currentY = Math.max(window.scrollY, 0);
        const delta = currentY - lastScrollY;

        if (document.body.classList.contains('menu-open')) {
            header.classList.remove('nav-hidden');
            lastScrollY = currentY;
            scrollTicking = false;
            return;
        }

        if (currentY <= hideThreshold) {
            header.classList.remove('nav-hidden');
        } else if (delta > 8) {
            header.classList.add('nav-hidden');
        } else if (delta < -8) {
            header.classList.remove('nav-hidden');
        }

        lastScrollY = currentY;
        scrollTicking = false;
    };
    window.addEventListener('scroll', () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(handleHeaderScroll);
    });

    gsap.to('.hero__content', {
        yPercent: -25,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.35 }
    });

    const slider = document.getElementById('process-slider');
    if (slider) {
        const viewport = slider.querySelector('.process-scroll__viewport');
        const sliderSection = slider.closest('.process');
        const track = slider.querySelector('.process-scroll__track');
        const slides = Array.from(slider.querySelectorAll('.process-slide'));
        const progressFillBar = slider.querySelector('.process-scroll__progress-fill');
        const buttons = slider.querySelectorAll('.process-scroll__btn');
        if (viewport && track && slides.length) {
            const setTrackX = gsap.quickSetter(track, 'x', 'px');
            const setProgressWidth = progressFillBar ? gsap.quickSetter(progressFillBar, 'width', '%') : null;
            viewport.setAttribute('tabindex', '0');
            slides.forEach((slide) => slide.setAttribute('tabindex', '0'));
            const slideVideos = slides
                .map((slide) => slide.querySelector('.process-slide__video'))
                .filter(Boolean);
            const totalSlides = slides.length;
            slides.forEach((slide, index) => {
                const title = slide.querySelector('.process-slide__title');
                const description = slide.querySelector('.process-slide__text');
                const video = slide.querySelector('.process-slide__video');
                const titleText = title?.textContent?.trim() || `Prozessschritt ${index + 1}`;
                slide.setAttribute('role', 'group');
                slide.setAttribute('aria-roledescription', 'slide');
                slide.setAttribute('aria-label', `Schritt ${index + 1} von ${totalSlides}: ${titleText}`);
                if (description) {
                    description.setAttribute('data-shadow-text', '');
                    description.setAttribute('data-shadow-trigger', 'manual');
                    prepareShadowText(description);
                }
                if (video && title) {
                    const label = title.textContent?.trim() || 'Prozessschritt Video';
                    video.setAttribute('aria-label', label);
                    video.setAttribute('title', label);
                }
            });
            const ensureVideoLoaded = (idx) => {
                const video = slideVideos[idx];
                if (!video || video.dataset.loaded === 'true') return;
                video.preload = 'metadata';
                video.load();
                video.dataset.loaded = 'true';
            };
            const playIfActive = (video, idx) => {
                if (activeIndex === idx && video && video.paused) {
                    const p = video.play();
                    if (p && p.catch) p.catch(() => {});
                }
            };
            const videoObserver = 'IntersectionObserver' in window
                ? new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        const video = entry.target;
                        const vidIdx = slideVideos.indexOf(video);
                        if (entry.isIntersecting && vidIdx >= 0) {
                            ensureVideoLoaded(vidIdx);
                            videoObserver.unobserve(video);
                        }
                    });
                }, { root: null, rootMargin: '200px 0px', threshold: 0.2 })
                : null;
            slideVideos.forEach((video, idx) => {
                video.preload = idx === 0 ? 'metadata' : 'none';
                video.muted = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                if (videoObserver && idx !== 0) videoObserver.observe(video);
                const markReady = () => {
                    video.classList.add('is-ready');
                };
                if (video.readyState >= 2) {
                    markReady();
                } else {
                    video.addEventListener('loadeddata', markReady, { once: true });
                }
            });
            let position = 0;
            let isDragging = false;
            let startX = 0;
            let startPosition = 0;
            let activeIndex = 0;
            let pointerDownSlide = null;
            let pointerMoved = false;
            let dragDelta = 0;
            let lastProgress = -1;
            let snapTween = null;

            let positions = [];

            const computePositions = () => {
                const base = slides[0] ? slides[0].offsetLeft : 0;
                positions = slides.map((s) => s.offsetLeft - base);
            };
            const slideWidthAt = (idx) => (slides[idx] ? slides[idx].getBoundingClientRect().width : 0);
            const updateEndPadding = () => {
                const lastWidth = slideWidthAt(slides.length - 1);
                const extra = Math.max(0, viewport.clientWidth - lastWidth);
                track.style.setProperty('--process-end-extra', `${extra}px`);
            };
            const maxOffset = () => {
                const scrollW = track.scrollWidth || 0;
                const lastPos = positions.length ? positions[positions.length - 1] : 0;
                return Math.max(0, scrollW - viewport.clientWidth, lastPos);
            };
            const snapConfig = { duration: prefersReduced ? 0.2 : 0.35, ease: prefersReduced ? 'power1.out' : 'power2.out' };

            const currentIndex = () => {
                if (!positions.length) return 0;
                const ref = position;
                const nearest = positions.reduce((best, pos, i) => {
                    const dist = Math.abs(ref - pos);
                    return dist < best.dist ? { i, dist } : best;
                }, { i: 0, dist: Number.POSITIVE_INFINITY });
                return nearest.i;
            };

            let sliderInView = true;
            const sliderObserver = new IntersectionObserver((entries) => {
                sliderInView = entries.some((e) => e.isIntersecting);
                if (!sliderInView) {
                    slideVideos.forEach((video) => video.pause());
                } else {
                    ensureVideoLoaded(activeIndex);
                    playIfActive(slideVideos[activeIndex], activeIndex);
                }
            }, { threshold: 0.3 });
            sliderObserver.observe(slider);

            const triggerShadowSequence = (slide) => {
                if (!slide || prefersReducedMotion) return;
                if (slide._shadowSequenceTimeout) {
                    clearTimeout(slide._shadowSequenceTimeout);
                    slide._shadowSequenceTimeout = null;
                }
                const description = slide.querySelector('.process-slide__text[data-shadow-text]');
                if (description) {
                    triggerShadowAnimation(description);
                }
            };

            const setActive = (idx, force = false) => {
                const next = Math.min(slides.length - 1, Math.max(0, idx));
                if (!force && next === activeIndex && slides[next]?.dataset.active === 'true') return;
                activeIndex = next;
                ensureVideoLoaded(activeIndex);
                slides.forEach((slide, i) => {
                    const isActive = i === activeIndex;
                    slide.dataset.active = isActive;
                    const video = slide.querySelector('.process-slide__video');
                    const title = slide.querySelector('.process-slide__title');
                    if (video) {
                        if (isActive) {
                            if (sliderInView) video.play().catch(() => {});
                        } else {
                            video.pause();
                            video.currentTime = 0;
                        }
                    }
                    if (!isActive) {
                        if (slide._shadowSequenceTimeout) {
                            clearTimeout(slide._shadowSequenceTimeout);
                            slide._shadowSequenceTimeout = null;
                        }
                        slide.querySelectorAll('[data-shadow-text]').forEach((el) => {
                            el.classList.remove('is-shadow-animated');
                        });
                    }
                    gsap.to(slide, {
                        scale: isActive ? 1.03 : 0.99,
                        autoAlpha: 1,
                        duration: prefersReduced ? 0 : 0.25,
                        ease: 'power2.out'
                    });
                });
            };

            const updateProgress = (pos) => {
                const max = maxOffset();
                if (!setProgressWidth || !max) return;
                const clamped = Math.min(1, Math.max(0, pos / max));
                const percent = clamped * 100;
                if (Math.abs(percent - lastProgress) < 0.2) return;
                lastProgress = percent;
                setProgressWidth(percent);
            };

            const clampPosition = (pos) => {
                const max = maxOffset();
                return Math.min(max, Math.max(0, pos));
            };

            const render = (pos) => {
                position = clampPosition(pos);
                setTrackX(-position);
                const idx = currentIndex();
                if (idx !== activeIndex) setActive(idx);
                updateProgress(position);
            };

            viewport.addEventListener('pointerdown', (evt) => {
                if (snapTween) snapTween.kill();
                isDragging = true;
                startX = evt.clientX;
                dragDelta = 0;
                startPosition = position;
                slider.classList.add('process-scroll--dragging');
                pointerDownSlide = evt.target.closest('.process-slide');
                pointerMoved = false;
                viewport.setPointerCapture(evt.pointerId);
            });
            window.addEventListener('pointermove', (evt) => {
                if (!isDragging) return;
                dragDelta = startX - evt.clientX;
                if (Math.abs(evt.movementX) > 2 || Math.abs(evt.movementY) > 2) pointerMoved = true;
                render(startPosition + dragDelta);
            });
            window.addEventListener('pointerup', (evt) => {
                if (!isDragging) return;
                isDragging = false;
                slider.classList.remove('process-scroll--dragging');
                try { viewport.releasePointerCapture(evt.pointerId); } catch (_) {}
                const clickSlide = !pointerMoved && pointerDownSlide ? slides.indexOf(pointerDownSlide) : -1;
                const deltaX = dragDelta;
                const current = currentIndex();
                pointerDownSlide = null;
                pointerMoved = false;
                dragDelta = 0;
                if (Math.abs(deltaX) > 24) {
                    snapTo(current + (deltaX > 0 ? 1 : -1), { force: true });
                    return;
                }
                if (clickSlide >= 0) {
                    snapTo(clickSlide, { force: true });
                } else {
                    snapTo(current);
                }
            });
            slider.addEventListener('dragstart', (e) => e.preventDefault());

            const snapTo = (idx, options = {}) => {
                if (!positions.length) computePositions();
                const { force = false } = options;
                const max = maxOffset();
                const targetIndex = Math.min(slides.length - 1, Math.max(0, idx));
                const targetPos = positions[targetIndex] ?? 0;
                const clamped = Math.max(0, Math.min(max, targetPos));
                if (snapTween) snapTween.kill();
                snapTween = gsap.to({ value: position }, {
                    value: clamped,
                    duration: snapConfig.duration,
                    ease: snapConfig.ease,
                    onUpdate() {
                        render(this.targets()[0].value);
                    },
                    onComplete() {
                        snapTween = null;
                        setActive(targetIndex, force);
                        if (sliderInView) {
                            triggerShadowSequence(slides[targetIndex]);
                        }
                        updateProgress(clamped);
                    }
                });
            };

            buttons.forEach((btn) => btn.addEventListener('click', () => {
                updateEndPadding();
                computePositions();
                const dir = btn.dataset.dir === 'next' ? 1 : -1;
                const baseIndex = currentIndex();
                snapTo(baseIndex + dir, { force: true });
            }));

            slides.forEach((slide) => { slide.style.cursor = 'pointer'; });

            slider.addEventListener('keydown', (evt) => {
                const baseIndex = currentIndex();
                if (['ArrowRight', 'PageDown'].includes(evt.key)) { evt.preventDefault(); snapTo(baseIndex + 1); }
                if (['ArrowLeft', 'PageUp'].includes(evt.key)) { evt.preventDefault(); snapTo(baseIndex - 1); }
                if (evt.key === 'Home') { evt.preventDefault(); snapTo(0); }
                if (evt.key === 'End') { evt.preventDefault(); snapTo(slides.length - 1); }
            });
            slides.forEach((slide, idx) => {
                slide.addEventListener('keydown', (evt) => {
                    if (evt.key !== 'Enter' && evt.key !== ' ') return;
                    evt.preventDefault();
                    snapTo(idx);
                    slide.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center', inline: 'center' });
                });
            });

            const refreshPositions = () => {
                updateEndPadding();
                computePositions();
                render(position);
            };
            window.addEventListener('resize', refreshPositions);
            window.addEventListener('load', refreshPositions);
            slides.forEach((slide) => {
                const img = slide.querySelector('img');
                if (img) {
                    if (img.complete) {
                        refreshPositions();
                    } else {
                        img.addEventListener('load', refreshPositions, { once: true });
                    }
                }
            });
            updateEndPadding();
            computePositions();
            render(0);
            setActive(0, true);
            ensureVideoLoaded(0);
            const initialVideo = slideVideos[0];
            if (initialVideo) {
                const p = initialVideo.play();
                if (p && p.catch) p.catch(() => {});
            }
        }
    }

} else {
    const fallbackPreloader = document.getElementById('preloader');
    document.body.classList.remove('is-preloading');
    if (fallbackPreloader) {
        fallbackPreloader.style.opacity = '0';
        fallbackPreloader.style.visibility = 'hidden';
        setTimeout(() => fallbackPreloader.remove(), 500);
    }
}

const initHoverVideos = () => {
    const cards = Array.from(document.querySelectorAll('[data-hover-video]'));
    if (!cards.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const allowHover = !prefersReducedMotion.matches;

    cards.forEach((card) => {
        const video = card.querySelector('video');
        if (!video) return;

        const setState = (playing) => {
            card.dataset.state = playing ? 'playing' : 'paused';
            card.setAttribute('aria-pressed', playing ? 'true' : 'false');
        };

        const play = () => {
            video.muted = true;
            video.setAttribute('playsinline', '');
            const playPromise = video.play();
            setState(true);
            if (playPromise && playPromise.catch) playPromise.catch(() => {});
        };

        const pause = () => {
            video.pause();
            video.currentTime = 0;
            setState(false);
        };

        const toggle = () => (video.paused ? play() : pause());

        if (allowHover) {
            card.addEventListener('mouseenter', play);
            card.addEventListener('mouseleave', pause);
            card.addEventListener('focusin', play);
            card.addEventListener('focusout', pause);
        }

        card.addEventListener('click', () => toggle());
        card.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault();
                toggle();
            }
        });

        setState(false);
    });
};

const initFaqAccordion = () => {
    const items = Array.from(document.querySelectorAll('.faq-accordion .accordion-item'));
    if (!items.length) return;

    const setState = (item, open, instant = false) => {
        const header = item.querySelector('.accordion-item-top-wrapper');
        const panel = item.querySelector('.accordion-item-bottom-wrapper');
        if (!header || !panel) return;

        item.classList.toggle('is-open', open);
        header.setAttribute('aria-expanded', open ? 'true' : 'false');

        if (open) {
            panel.hidden = false;
            panel.style.maxHeight = `${panel.scrollHeight}px`;
            return;
        }

        if (instant) {
            panel.style.maxHeight = '0px';
            panel.hidden = true;
            return;
        }

        panel.hidden = false;
        panel.style.maxHeight = `${panel.scrollHeight}px`;
        requestAnimationFrame(() => {
            panel.style.maxHeight = '0px';
        });
        setTimeout(() => {
            if (!item.classList.contains('is-open')) panel.hidden = true;
        }, 350);
    };

    items.forEach((item, index) => {
        const header = item.querySelector('.accordion-item-top-wrapper');
        const panel = item.querySelector('.accordion-item-bottom-wrapper');
        if (!header || !panel) return;

        const isInitiallyOpen = item.classList.contains('is-open') || index === 0;
        setState(item, isInitiallyOpen, true);

        header.addEventListener('click', () => {
            const willOpen = !item.classList.contains('is-open');
            items.forEach((other) => {
                if (other === item) return;
                setState(other, false);
            });
            setState(item, willOpen);
        });
    });

    window.addEventListener('resize', () => {
        items.forEach((item) => {
            if (!item.classList.contains('is-open')) return;
            const panel = item.querySelector('.accordion-item-bottom-wrapper');
            if (panel) panel.style.maxHeight = `${panel.scrollHeight}px`;
        });
    });
};

const initShadowText = () => {
    const targets = Array.from(document.querySelectorAll('[data-shadow-text]'));
    if (!targets.length) return;

    let observer = null;
    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                scheduleShadowAnimation(entry.target);
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.35 });
    }

    targets.forEach((target) => {
        prepareShadowText(target);
        if (target.dataset.shadowTrigger === 'manual') return;
        if (observer) {
            observer.observe(target);
        } else {
            scheduleShadowAnimation(target);
        }
    });
};

const initGroovyShopScroll = () => {
    const section = document.querySelector('.shop.shop-groovy');
    if (!section) return;

    const stickyParent = section.querySelector('.sticky-parent');
    const stickyChild = section.querySelector('.sticky-child');
    const scrollParent = section.querySelector('.scroll-h-parent');
    const setReady = () => section.classList.add('shop-groovy--ready');

    if (!stickyParent || !stickyChild || !scrollParent || !window.gsap || !window.ScrollTrigger) {
        setReady();
        return;
    }

    if (prefersReducedMotion) {
        setReady();
        return;
    }

    ScrollTrigger.create({
        trigger: section,
        start: 'top 85%',
        onEnter: setReady,
        onEnterBack: setReady
    });

    const mm = gsap.matchMedia();
    mm.add('(min-width: 992px)', () => {
        section.classList.add('is-pinned');
        const heroText = section.querySelector('.hero-text-parent');
        const shopLetters = heroText ? heroText.querySelectorAll('.super-text .span-text-out') : [];

        const pinTrigger = ScrollTrigger.create({
            trigger: stickyParent,
            start: 'top top',
            end: 'bottom bottom',
            pin: stickyChild,
            pinSpacing: true,
            anticipatePin: 1,
            onEnter: setReady,
            onEnterBack: setReady
        });

        const scrollTween = gsap.to(scrollParent, {
            '--shop-scroll-x': '-38%',
            ease: 'none',
            scrollTrigger: {
                trigger: stickyParent,
                start: 'top top',
                end: 'bottom bottom',
                scrub: true
            }
        });

        const parallaxTween = gsap.to(section, {
            '--shop-card-parallax': '-6%',
            ease: 'none',
            scrollTrigger: {
                trigger: stickyParent,
                start: 'top top',
                end: 'bottom bottom',
                scrub: true
            }
        });

        const heroShiftTween = heroText
            ? gsap.to(heroText, {
                yPercent: 8,
                ease: 'none',
                scrollTrigger: {
                    trigger: stickyParent,
                    start: 'top top',
                    end: 'top+=35%',
                    scrub: true
                }
            })
            : null;

        const heroWordTween = shopLetters.length
            ? gsap.to(shopLetters, {
                yPercent: 40,
                autoAlpha: 0,
                ease: 'none',
                stagger: { each: 0.08 },
                scrollTrigger: {
                    trigger: stickyParent,
                    start: 'top top',
                    end: 'top+=35%',
                    scrub: true
                }
            })
            : null;

        return () => {
            pinTrigger.kill();
            scrollTween.kill();
            parallaxTween.kill();
            if (heroShiftTween) heroShiftTween.kill();
            if (heroWordTween) heroWordTween.kill();
            section.classList.remove('is-pinned');
        };
    });

    mm.add('(max-width: 991px)', () => {
        const heroText = section.querySelector('.hero-text-parent');
        const shopLetters = heroText ? heroText.querySelectorAll('.super-text .span-text-out') : [];
        const heroShiftTween = heroText
            ? gsap.to(heroText, {
                yPercent: 6,
                ease: 'none',
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: 'top+=45%',
                    scrub: true
                }
            })
            : null;
        const heroWordTween = shopLetters.length
            ? gsap.to(shopLetters, {
                yPercent: 35,
                autoAlpha: 0,
                ease: 'none',
                stagger: { each: 0.08 },
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: 'top+=45%',
                    scrub: true
                }
            })
            : null;
        setReady();
        return () => {
            if (heroShiftTween) heroShiftTween.kill();
            if (heroWordTween) heroWordTween.kill();
        };
    });
};

const fitShopCardTitles = () => {
    const wrappers = Array.from(document.querySelectorAll('.shop-card .card-content-title'));
    if (!wrappers.length) return;

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const minSize = rootFontSize * 0.85;

    wrappers.forEach((wrapper) => {
        const title = wrapper.querySelector('.shop-card__title');
        if (!title) return;

        wrapper.style.removeProperty('--card-title-size');
        const maxSize = parseFloat(getComputedStyle(title).fontSize);
        if (!Number.isFinite(maxSize)) return;

        const available = wrapper.clientWidth;
        if (!available) return;

        wrapper.style.setProperty('--card-title-size', `${maxSize}px`);
        const baseWidth = title.scrollWidth;
        if (!baseWidth || baseWidth <= available) return;

        const scaledSize = Math.max(minSize, Math.floor(maxSize * (available / baseWidth)));
        wrapper.style.setProperty('--card-title-size', `${scaledSize}px`);

        let currentSize = scaledSize;
        while (currentSize > minSize && title.scrollWidth > available) {
            currentSize -= 1;
            wrapper.style.setProperty('--card-title-size', `${currentSize}px`);
        }
    });
};

const scheduleFitShopCardTitles = () => {
    if (scheduleFitShopCardTitles._raf) cancelAnimationFrame(scheduleFitShopCardTitles._raf);
    scheduleFitShopCardTitles._raf = requestAnimationFrame(() => {
        scheduleFitShopCardTitles._raf = null;
        fitShopCardTitles();
    });
};

initHoverVideos();
initFaqAccordion();
initShadowText();
initGroovyShopScroll();
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleFitShopCardTitles);
} else {
    window.addEventListener('load', scheduleFitShopCardTitles);
}
window.addEventListener('resize', scheduleFitShopCardTitles);

