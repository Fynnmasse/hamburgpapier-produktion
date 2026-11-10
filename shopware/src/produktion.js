/* ==========================================================================
   Hamburgpapier · Produktionsseite — Skript für den Erlebniswelt-Block
   Läuft ohne externe Bibliothek und fasst nur Elemente innerhalb von
   #hpp-produktion an. Ausnahme: CMS-Hüllen um den Block, die mit
   „overflow: hidden" das Mitlaufen der FAQ-Überschrift verhindern würden,
   bekommen „overflow: clip" (sieht gleich aus, erlaubt aber position: sticky).
   ========================================================================== */
(function () {
    'use strict';

    var ROOT_ID = 'hpp-produktion';

    var boot = function () {
        var root = document.getElementById(ROOT_ID);
        if (!root || root.getAttribute('data-hpp-init') === '1') { return; }
        root.setAttribute('data-hpp-init', '1');

        var win = window;
        var reduced = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
        var hasIO = 'IntersectionObserver' in win;
        var noop = function () {};

        /* Datensparmodus bzw. langsame Verbindung: weniger Video laden */
        var connection = win.navigator.connection || win.navigator.mozConnection || win.navigator.webkitConnection || {};
        var saveData = connection.saveData === true;
        var slowNet = /(^|-)(2g|3g)$/.test(connection.effectiveType || '');
        var lowData = saveData || slowNet;
        var isPhone = function () { return !!(win.matchMedia && win.matchMedia('(max-width: 767px)').matches); };

        var q = function (selector, context) { return (context || root).querySelector(selector); };
        var qa = function (selector, context) {
            return Array.prototype.slice.call((context || root).querySelectorAll(selector));
        };
        var clamp = function (value, min, max) { return Math.min(max, Math.max(min, value)); };
        var raf = function (callback) { return win.requestAnimationFrame(callback); };
        var safe = function (name, fn) {
            try {
                fn();
            } catch (error) {
                if (win.console && win.console.warn) { win.console.warn('[hpp] ' + name, error); }
            }
        };
        var play = function (video) {
            if (!video) { return; }
            var promise = video.play();
            if (promise && typeof promise.catch === 'function') { promise.catch(noop); }
        };
        var pad = function (number) { return (number < 10 ? '0' : '') + number; };

        root.classList.add('hpp--js');

        /* Kleine Animation eines Zahlenwerts (für das Einrasten des Karussells) */
        var tween = function (from, to, duration, onUpdate, onDone) {
            var start = win.performance.now();
            var handle = 0;
            var dead = false;
            var step = function () {
                if (dead) { return; }
                var t = duration > 0 ? Math.min(1, (win.performance.now() - start) / duration) : 1;
                var eased = 1 - Math.pow(1 - t, 3);
                onUpdate(from + (to - from) * eased);
                if (t < 1) {
                    handle = raf(step);
                } else if (onDone) {
                    onDone();
                }
            };
            handle = raf(step);
            return {
                kill: function () {
                    dead = true;
                    if (handle) { win.cancelAnimationFrame(handle); }
                }
            };
        };

        /* ------------------------------------------------------------------
           Shop-Rahmen: mitlaufender Header und Abstand zum Seitenanfang
           ------------------------------------------------------------------ */
        var shopHeader = document.querySelector('header.header-main');
        var topOffset = -1;
        var headerSticky = false;
        var headerChecked = -1000;
        var measureTop = function () {
            var value = 0;
            if (shopHeader) {
                /* Ob der Header mitläuft, höchstens alle 400 ms neu nachsehen */
                var now = win.performance.now();
                if (now - headerChecked > 400) {
                    headerChecked = now;
                    var position = win.getComputedStyle(shopHeader).position;
                    headerSticky = position === 'sticky' || position === 'fixed';
                }
                if (headerSticky) {
                    var rect = shopHeader.getBoundingClientRect();
                    if (rect.top <= 1 && rect.bottom > 0) { value = Math.round(rect.bottom); }
                }
            }
            if (value !== topOffset) {
                topOffset = value;
                root.style.setProperty('--hpp-top', value + 'px');
            }
            return value;
        };
        /* Damit Video und Titelfeld zusammen den ersten Bildschirm füllen: Abstand des
           Blocks zum Seitenanfang und Höhe des Titelfelds (plus Ränder) an das CSS melden. */
        var heroPanel = q('.hpp-hero__panel');
        var measurePageTop = function () {
            var top = root.getBoundingClientRect().top + (win.pageYOffset || 0);
            var value = top > 0 && top < win.innerHeight * 0.6 ? Math.round(top) : 0;
            root.style.setProperty('--hpp-page-top', value + 'px');
            if (heroPanel) { root.style.setProperty('--hpp-hero-rest', (heroPanel.offsetHeight + 32) + 'px'); }
        };

        /* „overflow: hidden" an einer Hülle macht position: sticky wirkungslos.
           „clip" schneidet genauso ab, lässt das Mitlaufen aber zu. */
        safe('sticky', function () {
            if (!(win.CSS && win.CSS.supports && win.CSS.supports('overflow', 'clip'))) { return; }
            var isOpen = function (value) { return value === 'visible' || value === 'clip'; };
            var node = root.parentElement;
            while (node && node !== document.body && node !== document.documentElement) {
                var style = win.getComputedStyle(node);
                if (!isOpen(style.overflowX) || !isOpen(style.overflowY)) { node.style.overflow = 'clip'; }
                node = node.parentElement;
            }
        });

        /* ------------------------------------------------------------------
           Hero-Video
           ------------------------------------------------------------------ */
        safe('hero', function () {
            var hero = q('.hpp-hero');
            var video = q('.hpp-hero__video');
            var poster = q('.hpp-hero__poster');
            var toggle = q('.hpp-hero__toggle');
            if (!hero || !video) { return; }

            var showVideo = function () { root.classList.add('hpp--video'); };
            var split = function (value) {
                return (value || '').split('|')
                    .map(function (source) { return source.trim(); })
                    .filter(Boolean);
            };
            var all = split(video.getAttribute('data-hpp-videos'));
            var light = split(video.getAttribute('data-hpp-videos-light'));
            var posters = poster ? split(poster.getAttribute('data-hpp-posters')) : [];
            /* Am Handy und bei langsamer Verbindung nur die kleinen Videos */
            var list = light.length && (slowNet || isPhone()) ? light : all;
            if (!list.length) { return; }

            /* Das unscharfe Vorschaubild steht sofort, bis das Video Bilder liefert */
            var showPoster = function (source) {
                var index = all.indexOf(source);
                var image = posters[index >= 0 ? index : 0];
                if (poster && image) { poster.style.backgroundImage = 'url("' + image + '")'; }
            };

            /* Im Datensparmodus bleibt es beim Vorschaubild */
            if (saveData) { showPoster(list[0]); return; }

            /* Bei jedem Besuch eines der hinterlegten Videos, nie zweimal dasselbe.
               Es wird nur dieses eine geladen. */
            var last = '';
            try { last = win.localStorage.getItem('hpp-hero-video-last') || ''; } catch (error) { last = ''; }
            var candidates = list.length > 1 && last
                ? list.filter(function (source) { return source !== last; })
                : list;
            if (!candidates.length) { candidates = list; }
            var pick = candidates[Math.floor(Math.random() * candidates.length)];
            try { win.localStorage.setItem('hpp-hero-video-last', pick); } catch (error) { /* Speicher gesperrt */ }
            showPoster(pick);

            video.muted = true;
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            /* Erst einblenden, wenn wirklich ein Bild da ist */
            video.addEventListener('loadeddata', showVideo, { once: true });
            win.setTimeout(function () {
                if (video.readyState >= 2) { showVideo(); }
            }, 4000);
            video.preload = reduced ? 'metadata' : 'auto';
            video.src = pick;

            /* Abspielen nur, wenn das Video zu sehen ist und nicht angehalten wurde.
               Bei „Bewegung reduzieren" startet es erst auf Wunsch. */
            var paused = reduced;
            var visible = true;
            var sync = function () {
                if (paused || !visible) {
                    video.pause();
                } else {
                    play(video);
                }
                if (toggle) {
                    toggle.setAttribute('data-state', paused ? 'paused' : 'playing');
                    toggle.setAttribute('aria-label', paused ? 'Video abspielen' : 'Video anhalten');
                }
            };
            if (toggle) {
                toggle.hidden = false;
                toggle.addEventListener('click', function () {
                    paused = !paused;
                    sync();
                });
            }
            if (hasIO) {
                new win.IntersectionObserver(function (entries) {
                    visible = entries[entries.length - 1].isIntersecting;
                    sync();
                }).observe(hero);
            }
            sync();
        });

        /* ------------------------------------------------------------------
           Schritt-Karussell
           ------------------------------------------------------------------ */
        safe('slider', function () {
            var slider = q('#hpp-process-slider');
            if (!slider) { return; }
            var viewport = q('.hpp-slider__viewport', slider);
            var track = q('.hpp-slider__track', slider);
            var slides = qa('.hpp-slide', slider);
            var fill = q('.hpp-slider__progress-fill', slider);
            var current = q('.hpp-slider__current', slider);
            var status = q('.hpp-slider__status', slider);
            var toggle = q('.hpp-slider__toggle', slider);
            var buttons = qa('.hpp-slider__btn', slider);
            if (!viewport || !track || !slides.length) { return; }

            var total = slides.length;
            var videos = slides.map(function (slide) { return q('.hpp-slide__video', slide); });
            var labels = [];
            var active = 0;
            var inView = !hasIO;
            var armed = false;
            /* Bei „Bewegung reduzieren" laufen die Videos erst auf Wunsch */
            var paused = reduced;
            var announce = false;
            var canPlay = function () { return inView && !paused; };

            slides.forEach(function (slide, index) {
                var title = q('.hpp-slide__title', slide);
                /* Weiche Trennstriche aus dem Titel nicht mit vorlesen lassen */
                var label = title && title.textContent
                    ? title.textContent.replace(/\u00AD/g, '').trim()
                    : 'Prozessschritt ' + (index + 1);
                labels.push(label);
                /* Nur der aktive Schritt liegt in der Tab-Reihenfolge */
                slide.setAttribute('tabindex', index === 0 ? '0' : '-1');
                slide.setAttribute('role', 'group');
                slide.setAttribute('aria-roledescription', 'slide');
                slide.setAttribute('aria-label', 'Schritt ' + (index + 1) + ' von ' + total + ': ' + label);
                if (videos[index]) {
                    videos[index].setAttribute('aria-label', label);
                    videos[index].setAttribute('title', label);
                }
            });

            /* --- Videos: erst laden, wenn das Karussell in die Nähe kommt --- */
            /* Stufe 1 = Eckdaten und erstes Bild, Stufe 2 = vorpuffern */
            var loadVideo = function (index, level) {
                var video = videos[index];
                if (!video) { return; }
                var have = parseInt(video.getAttribute('data-hpp-loaded') || '0', 10);
                if (have >= level) { return; }
                video.preload = level > 1 ? 'auto' : 'metadata';
                video.setAttribute('data-hpp-loaded', String(level));
                /* Neu laden nur beim ersten Mal, sonst verschwände das sichtbare Standbild kurz */
                if (have === 0) { video.load(); }
            };
            /* Manche Videos beginnen dunkel: ein Stück vorspulen, damit ein Bild zu sehen ist */
            var primeFrame = function (video) {
                if (!video || video.getAttribute('data-hpp-primed') === '1') { return; }
                var prime = function () {
                    if (video.getAttribute('data-hpp-primed') === '1') { return; }
                    video.setAttribute('data-hpp-primed', '1');
                    if (!video.paused) { return; }
                    var time = isFinite(video.duration) && video.duration > 0
                        ? Math.min(0.05, Math.max(0, video.duration * 0.01))
                        : 0.01;
                    try { video.currentTime = time; } catch (error) { /* Sprung nicht möglich */ }
                };
                if (video.readyState >= 1) {
                    prime();
                } else {
                    video.addEventListener('loadedmetadata', prime, { once: true });
                }
            };
            /* Aktiven Schritt vorpuffern, dazu den nächsten (am Desktop auch den vorherigen) */
            var warmNeighbours = function (index) {
                loadVideo(index, 2);
                if (lowData) { return; }
                loadVideo(index + 1, 2);
                if (!isPhone()) { loadVideo(index - 1, 2); }
            };
            var restart = function (video) {
                if (video.readyState > 0) {
                    try { video.currentTime = 0; } catch (error) { /* Sprung nicht möglich */ }
                } else {
                    video.addEventListener('loadedmetadata', function () {
                        try { video.currentTime = 0; } catch (error) { /* Sprung nicht möglich */ }
                    }, { once: true });
                }
            };
            var lazyObserver = hasIO
                ? new win.IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) { return; }
                        var index = videos.indexOf(entry.target);
                        loadVideo(index, 1);
                        if (entry.target.getAttribute('data-hpp-prime') === 'true') { primeFrame(entry.target); }
                        lazyObserver.unobserve(entry.target);
                    });
                }, { root: null, rootMargin: '200px 0px', threshold: 0.2 })
                : null;
            var armVideos = function () {
                if (armed) { return; }
                armed = true;
                warmNeighbours(active);
                videos.forEach(function (video, index) {
                    if (!video) { return; }
                    video.muted = true;
                    video.setAttribute('playsinline', '');
                    video.setAttribute('webkit-playsinline', '');
                    if (lazyObserver && index !== 0) {
                        lazyObserver.observe(video);
                    } else {
                        loadVideo(index, 1);
                        if (video.getAttribute('data-hpp-prime') === 'true') { primeFrame(video); }
                    }
                });
                if (canPlay() && videos[active]) { play(videos[active]); }
            };

            /* --- Aktiver Schritt --- */
            var updateControls = function () {
                if (current) { current.textContent = pad(active + 1); }
                buttons.forEach(function (button) {
                    var isNext = button.getAttribute('data-dir') === 'next';
                    var atEnd = isNext ? active >= total - 1 : active <= 0;
                    button.setAttribute('aria-disabled', atEnd ? 'true' : 'false');
                });
                /* Für Screenreader ansagen, sobald der Nutzer selbst geblättert hat */
                if (status && announce) {
                    status.textContent = 'Schritt ' + (active + 1) + ' von ' + total + ': ' + labels[active];
                }
            };
            var syncToggle = function () {
                if (!toggle) { return; }
                toggle.setAttribute('data-state', paused ? 'paused' : 'playing');
                toggle.setAttribute('aria-label', paused ? 'Videos abspielen' : 'Videos anhalten');
            };
            var setActive = function (index, force) {
                var next = clamp(index, 0, total - 1);
                if (!force && next === active && slides[next].getAttribute('data-active') === 'true') { return; }
                active = next;
                slides.forEach(function (slide, slideIndex) {
                    var isActive = slideIndex === active;
                    var video = videos[slideIndex];
                    slide.setAttribute('data-active', isActive ? 'true' : 'false');
                    slide.setAttribute('tabindex', isActive ? '0' : '-1');
                    if (!video) { return; }
                    if (!isActive) {
                        video.pause();
                    } else if (armed) {
                        warmNeighbours(active);
                        restart(video);
                        if (canPlay()) { play(video); }
                    }
                });
                /* Lag der Fokus auf einer Karte, wandert er zum aktiven Schritt mit */
                var focused = document.activeElement;
                if (focused && focused !== slides[active] && slides.indexOf(focused) >= 0) {
                    try { slides[active].focus({ preventScroll: true }); } catch (error) { slides[active].focus(); }
                }
                updateControls();
            };

            /* --- Position --- */
            var position = 0;
            var positions = [];
            var dirty = true;
            var snap = null;

            var computePositions = function () {
                var base = slides[0].offsetLeft;
                positions = slides.map(function (slide) { return slide.offsetLeft - base; });
                dirty = false;
            };
            var maxOffset = function () { return positions.length ? positions[positions.length - 1] : 0; };
            var nearestIndex = function () {
                var best = 0;
                var distance = Infinity;
                positions.forEach(function (value, index) {
                    var gap = Math.abs(position - value);
                    if (gap < distance) { distance = gap; best = index; }
                });
                return best;
            };
            /* Nächster Schritt in Ziehrichtung, ausgehend von der Loslass-Position */
            var indexInDirection = function (direction) {
                var index;
                if (direction > 0) {
                    for (index = 0; index < total; index += 1) {
                        if (positions[index] >= position - 1) { return index; }
                    }
                    return total - 1;
                }
                for (index = total - 1; index >= 0; index -= 1) {
                    if (positions[index] <= position + 1) { return index; }
                }
                return 0;
            };
            var render = function (value) {
                var max = maxOffset();
                position = clamp(value, 0, max);
                track.style.transform = 'translate3d(' + (-position) + 'px, 0, 0)';
                var index = nearestIndex();
                if (index !== active) { setActive(index, false); }
                if (fill) { fill.style.width = (max > 0 ? (position / max) * 100 : 0).toFixed(2) + '%'; }
            };
            var snapTo = function (index, force) {
                announce = true;
                if (dirty || !positions.length) { computePositions(); }
                var target = clamp(index, 0, total - 1);
                var to = clamp(positions[target] || 0, 0, maxOffset());
                if (snap) { snap.kill(); }
                snap = tween(position, to, reduced ? 0 : 350, render, function () {
                    snap = null;
                    setActive(target, force);
                });
            };

            /* --- Ziehen / Tippen --- */
            var dragging = false;
            var startX = 0;
            var startPosition = 0;
            var delta = 0;
            var moved = false;
            var downSlide = null;
            var pendingPosition = 0;
            var renderQueued = false;

            var queueRender = function (value) {
                pendingPosition = value;
                if (renderQueued) { return; }
                renderQueued = true;
                raf(function () {
                    renderQueued = false;
                    if (dragging) { render(pendingPosition); }
                });
            };
            var endDrag = function (event, cancelled) {
                if (!dragging) { return; }
                dragging = false;
                slider.classList.remove('hpp-slider--dragging');
                try { viewport.releasePointerCapture(event.pointerId); } catch (error) { /* nicht gefangen */ }
                render(startPosition + delta);

                var distance = delta;
                var clicked = !moved && downSlide ? slides.indexOf(downSlide) : -1;
                downSlide = null;
                moved = false;
                delta = 0;

                if (cancelled) { snapTo(nearestIndex(), false); return; }
                if (Math.abs(distance) > 24) { snapTo(indexInDirection(distance > 0 ? 1 : -1), true); return; }
                if (clicked >= 0) {
                    snapTo(clicked, true);
                } else {
                    snapTo(nearestIndex(), false);
                }
            };

            viewport.addEventListener('pointerdown', function (event) {
                if (event.pointerType === 'mouse' && event.button !== 0) { return; }
                if (snap) { snap.kill(); snap = null; }
                if (dirty || !positions.length) { computePositions(); }
                dragging = true;
                startX = event.clientX;
                startPosition = position;
                delta = 0;
                moved = false;
                downSlide = event.target && event.target.closest ? event.target.closest('.hpp-slide') : null;
                slider.classList.add('hpp-slider--dragging');
                try { viewport.setPointerCapture(event.pointerId); } catch (error) { /* nicht unterstützt */ }
            });
            win.addEventListener('pointermove', function (event) {
                if (!dragging) { return; }
                delta = startX - event.clientX;
                if (Math.abs(delta) > 3) { moved = true; }
                queueRender(startPosition + delta);
            });
            win.addEventListener('pointerup', function (event) { endDrag(event, false); });
            win.addEventListener('pointercancel', function (event) { endDrag(event, true); });
            slider.addEventListener('dragstart', function (event) { event.preventDefault(); });

            /* --- Pfeile + Tastatur --- */
            buttons.forEach(function (button) {
                button.addEventListener('click', function () {
                    var direction = button.getAttribute('data-dir') === 'next' ? 1 : -1;
                    snapTo(nearestIndex() + direction, true);
                });
            });
            if (toggle) {
                toggle.addEventListener('click', function () {
                    paused = !paused;
                    if (paused) {
                        videos.forEach(function (video) { if (video) { video.pause(); } });
                    } else if (inView) {
                        armVideos();
                        play(videos[active]);
                    }
                    syncToggle();
                });
            }
            slider.addEventListener('keydown', function (event) {
                var key = event.key;
                var index = nearestIndex();
                if (key === 'ArrowRight' || key === 'PageDown') { event.preventDefault(); snapTo(index + 1, false); }
                if (key === 'ArrowLeft' || key === 'PageUp') { event.preventDefault(); snapTo(index - 1, false); }
                if (key === 'Home') { event.preventDefault(); snapTo(0, false); }
                if (key === 'End') { event.preventDefault(); snapTo(total - 1, false); }
            });
            slides.forEach(function (slide, index) {
                slide.addEventListener('keydown', function (event) {
                    if (event.key !== 'Enter' && event.key !== ' ') { return; }
                    event.preventDefault();
                    snapTo(index, false);
                });
            });

            /* --- Größe ändert sich: Positionen neu vermessen --- */
            var refreshQueued = false;
            var refresh = function () {
                dirty = true;
                if (refreshQueued) { return; }
                refreshQueued = true;
                raf(function () {
                    refreshQueued = false;
                    if (dragging || snap) { return; }
                    computePositions();
                    render(positions[active] || 0);
                });
            };
            win.addEventListener('resize', refresh);
            win.addEventListener('load', refresh);
            if ('ResizeObserver' in win) {
                new win.ResizeObserver(refresh).observe(viewport);
            }

            /* --- Sichtbarkeit: Videos nur abspielen, wenn das Karussell zu sehen ist --- */
            if (hasIO) {
                new win.IntersectionObserver(function (entries) {
                    inView = entries.some(function (entry) { return entry.isIntersecting; });
                    if (!inView) {
                        videos.forEach(function (video) { if (video) { video.pause(); } });
                        return;
                    }
                    armVideos();
                    if (!paused) { play(videos[active]); }
                }, { threshold: 0.3 }).observe(slider);
                var nearObserver = new win.IntersectionObserver(function (entries) {
                    if (!entries.some(function (entry) { return entry.isIntersecting; })) { return; }
                    nearObserver.disconnect();
                    armVideos();
                }, { rootMargin: '600px 0px' });
                nearObserver.observe(slider);
            }

            computePositions();
            render(0);
            setActive(0, true);
            syncToggle();
            if (!hasIO) { armVideos(); }
        });

        /* ------------------------------------------------------------------
           Sanftes Einblenden beim Scrollen
           ------------------------------------------------------------------ */
        safe('reveal', function () {
            var targets = qa('[data-hpp-reveal]');
            if (!targets.length) { return; }
            var show = function (target) { target.classList.add('is-in'); };
            if (reduced || !hasIO) { targets.forEach(show); return; }

            var observer = new win.IntersectionObserver(function (entries, self) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) { return; }
                    show(entry.target);
                    self.unobserve(entry.target);
                });
            }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
            targets.forEach(function (target) { observer.observe(target); });
            /* Sicherheitsnetz: nichts bleibt dauerhaft unsichtbar */
            win.addEventListener('load', function () {
                win.setTimeout(function () { targets.forEach(show); }, 6000);
            });
        });

        /* ------------------------------------------------------------------
           FAQ-Akkordeon
           ------------------------------------------------------------------ */
        safe('faq', function () {
            var items = qa('.hpp-acc__item');
            if (!items.length) { return; }

            var setState = function (item, open, instant) {
                var head = q('.hpp-acc__head', item);
                var panel = q('.hpp-acc__panel', item);
                if (!head || !panel) { return; }

                item.classList.toggle('is-open', open);
                head.setAttribute('aria-expanded', open ? 'true' : 'false');

                if (open) {
                    panel.hidden = false;
                    panel.style.maxHeight = panel.scrollHeight + 48 + 'px';
                    return;
                }
                if (instant) {
                    panel.style.maxHeight = '0px';
                    panel.hidden = true;
                    return;
                }
                panel.hidden = false;
                panel.style.maxHeight = panel.scrollHeight + 'px';
                raf(function () { panel.style.maxHeight = '0px'; });
                win.setTimeout(function () {
                    if (!item.classList.contains('is-open')) { panel.hidden = true; }
                }, 360);
            };

            items.forEach(function (item, index) {
                var head = q('.hpp-acc__head', item);
                if (!head) { return; }
                setState(item, item.classList.contains('is-open') || index === 0, true);
                head.addEventListener('click', function () {
                    var willOpen = !item.classList.contains('is-open');
                    items.forEach(function (other) {
                        if (other !== item) { setState(other, false, false); }
                    });
                    setState(item, willOpen, false);
                });
            });

            win.addEventListener('resize', function () {
                items.forEach(function (item) {
                    if (!item.classList.contains('is-open')) { return; }
                    var panel = q('.hpp-acc__panel', item);
                    if (panel) {
                        panel.style.maxHeight = 'none';
                        panel.style.maxHeight = panel.scrollHeight + 48 + 'px';
                    }
                });
            });
        });

        /* ------------------------------------------------------------------
           Start
           ------------------------------------------------------------------ */
        var scrollQueued = false;
        var onScroll = function () {
            if (scrollQueued) { return; }
            scrollQueued = true;
            raf(function () {
                scrollQueued = false;
                measureTop();
            });
        };
        var onResize = function () {
            measurePageTop();
            measureTop();
        };
        win.addEventListener('scroll', onScroll, { passive: true });
        win.addEventListener('resize', onResize);
        win.addEventListener('load', onResize);
        /* Mit geladener Schrift kann das Titelfeld eine andere Höhe haben */
        if (document.fonts && document.fonts.ready) { document.fonts.ready.then(onResize); }
        measurePageTop();
        measureTop();
    };

    if (document.getElementById(ROOT_ID)) {
        boot();
    } else {
        document.addEventListener('DOMContentLoaded', boot);
    }
})();
