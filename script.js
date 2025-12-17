
// Inhalt aus script.js
if (window.gsap) {
    gsap.registerPlugin(ScrollTrigger);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const preloader = document.getElementById('preloader');
    const progressFill = document.querySelector('.preloader__progress-fill');
    const percentLabel = document.querySelector('.preloader__percent');
    const ring = document.querySelector('.preloader__ring');
    const preloaderState = { value: 0 };
    let introPlayed = false;

    gsap.set('.hero video', { autoAlpha: 0, scale: 1.05, filter: 'blur(6px) saturate(1.05)' });
    gsap.set('.hero__content', { autoAlpha: 0, y: 34 });

    const updateProgress = (value) => {
        if (!progressFill) return;
        const clamped = Math.min(100, Math.max(0, Math.round(value)));
        gsap.set(progressFill, { width: `${clamped}%` });
        if (percentLabel) percentLabel.textContent = `${clamped}%`;
    };

    const playIntro = () => {
        if (introPlayed) return;
        introPlayed = true;
        const introTl = gsap.timeline({ defaults: { ease: 'power2.out' } });
        introTl
            .to('.hero video', { autoAlpha: 1, scale: 1, filter: 'blur(0px) saturate(1.05)', duration: 2.8 }, 0)
            .to('.hero__content', { autoAlpha: 1, y: 0, duration: 1.8 }, 0.9)
            .from('.hero-subtitle', { autoAlpha: 0, y: 22, duration: 1.3 }, '-=0.8');
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
                    playIntro();
                }
            })
                .to('.preloader__badge', { y: prefersReduced ? 0 : -10, duration: prefersReduced ? 0.4 : 0.75 }, '-=0.2')
                .to(preloader, { autoAlpha: 0, duration: prefersReduced ? 0.5 : 0.95 }, '-=0.1');
        };

        window.addEventListener('load', hidePreloader);
        setTimeout(hidePreloader, 11000);
    } else {
        document.body.classList.remove('is-preloading');
        playIntro();
    }

    // Smooth scrolling with inertia (Luxy-like)
    (function () {
        const scroller = document.getElementById('smooth-scroll');
        if (!scroller) return;

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isTouchPrimary = window.matchMedia('(pointer: coarse)').matches;
        if (prefersReduced || isTouchPrimary) return;

        document.body.classList.add('smooth-scroll-enabled');

        let target = window.scrollY;
        let current = window.scrollY;
        const ease = 0.12;

        const setHeight = () => {
            const height = Math.max(scroller.scrollHeight, window.innerHeight);
            document.body.style.height = `${height}px`;
        };
        setHeight();

        const resizeObserver = new ResizeObserver(setHeight);
        resizeObserver.observe(scroller);
        window.addEventListener('resize', setHeight);

        const raf = () => {
            target = window.scrollY;
            current += (target - current) * ease;
            if (Math.abs(target - current) < 0.1) current = target;
            scroller.style.transform = `translate3d(0, ${-current}px, 0)`;
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

    const heroVideo = document.querySelector('.hero video');
    if (heroVideo) {
        heroVideo.muted = true;
        heroVideo.setAttribute('playsinline', '');
        heroVideo.setAttribute('webkit-playsinline', '');
        heroVideo.play().catch(() => {});
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

        if (currentY <= 24) {
            header.classList.remove('nav-hidden');
        } else if (delta > 6) {
            header.classList.add('nav-hidden');
        } else if (delta < -6) {
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
            const slideVideos = slides
                .map((slide) => slide.querySelector('.process-slide__video'))
                .filter(Boolean);
            const playIfActive = (video, idx) => {
                if (activeIndex === idx && video.paused) {
                    const p = video.play();
                    if (p && p.catch) p.catch(() => {});
                }
            };
            slideVideos.forEach((video) => {
                video.preload = 'auto';
                video.muted = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                const warmup = () => {
                    const p = video.play();
                    if (p && p.then) {
                        p.then(() => {
                            video.pause();
                            video.currentTime = 0;
                            playIfActive(video, slideVideos.indexOf(video));
                        }).catch(() => {});
                    } else {
                        video.pause();
                        video.currentTime = 0;
                    }
                };
                if (video.readyState >= 2) {
                    warmup();
                } else {
                    video.addEventListener('loadeddata', warmup, { once: true });
                }
                video.addEventListener('loadeddata', () => video.classList.add('is-ready'), { once: true });
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

            const setActive = (idx) => {
                const next = Math.min(slides.length - 1, Math.max(0, idx));
                if (next === activeIndex && slides[next]?.dataset.active === 'true') return;
                activeIndex = next;
                slides.forEach((slide, i) => {
                    const isActive = i === activeIndex;
                    slide.dataset.active = isActive;
                    const video = slide.querySelector('.process-slide__video');
                    if (video) {
                        if (isActive) {
                            video.play().catch(() => {});
                        } else {
                            video.pause();
                            video.currentTime = 0;
                        }
                    }
                    gsap.to(slide, {
                        scale: isActive ? 1.03 : 0.97,
                        autoAlpha: isActive ? 1 : 0.88,
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
                    snapTo(current + (deltaX > 0 ? 1 : -1));
                    return;
                }
                if (clickSlide >= 0) {
                    snapTo(clickSlide);
                } else {
                    snapTo(current);
                }
            });
            slider.addEventListener('dragstart', (e) => e.preventDefault());

            const snapTo = (idx) => {
                if (!positions.length) computePositions();
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
                        setActive(targetIndex);
                        updateProgress(clamped);
                    }
                });
            };

            buttons.forEach((btn) => btn.addEventListener('click', () => {
                updateEndPadding();
                computePositions();
                const dir = btn.dataset.dir === 'next' ? 1 : -1;
                const baseIndex = currentIndex();
                snapTo(baseIndex + dir);
            }));

            slides.forEach((slide) => { slide.style.cursor = 'pointer'; });

            slider.addEventListener('keydown', (evt) => {
                const baseIndex = currentIndex();
                if (evt.key === 'ArrowRight') { evt.preventDefault(); snapTo(baseIndex + 1); }
                if (evt.key === 'ArrowLeft') { evt.preventDefault(); snapTo(baseIndex - 1); }
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
            setActive(0);
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

initHoverVideos();
initFaqAccordion();
