/* ==========================================================================
   Hamburgpapier · Produktionsseite — Skript für den Erlebniswelt-Block
   Läuft ohne externe Bibliothek und fasst nur Elemente innerhalb von
   #hpp-produktion an. Ausnahme: CMS-Hüllen um den Block, die mit
   „overflow: hidden" das Anpinnen der Shop-Szene verhindern würden,
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

        root.classList.add('hpp--js');

        /* ------------------------------------------------------------------
           Scroll-Takt: alle scrollabhängigen Aufgaben laufen gebündelt,
           höchstens einmal pro Bild.
           ------------------------------------------------------------------ */
        var frameTasks = [];
        var frameQueued = false;
        var runFrame = function () {
            frameQueued = false;
            frameTasks.forEach(function (task) { safe('frame', task); });
        };
        var requestFrame = function () {
            if (frameQueued) { return; }
            frameQueued = true;
            raf(runFrame);
        };

        /* Kleine Animation eines Zahlenwerts (für das Einrasten des Sliders) */
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
        var measurePageTop = function () {
            var top = root.getBoundingClientRect().top + (win.pageYOffset || 0);
            var value = top > 0 && top < win.innerHeight * 0.6 ? Math.round(top) : 0;
            root.style.setProperty('--hpp-page-top', value + 'px');
        };

        /* ------------------------------------------------------------------
           Wort-für-Wort-Einblendung
           ------------------------------------------------------------------ */
        var prepareShadow = function (target) {
            if (!target || target.getAttribute('data-hpp-shadow-ready') === '1') { return; }
            var raw = target.textContent;
            if (!raw || !raw.trim()) { return; }
            target.setAttribute('data-hpp-shadow-ready', '1');

            var words = raw.trim().split(/\s+/);
            var fragment = document.createDocumentFragment();
            var index = 0;
            words.forEach(function (word, wordIndex) {
                word.split(/(-)/).filter(Boolean).forEach(function (segment) {
                    var span = document.createElement('span');
                    span.textContent = segment;
                    span.setAttribute('data-text', segment);
                    index += 1;
                    span.style.setProperty('--hpp-sh-delay', (index * 0.08).toFixed(2) + 's');
                    fragment.appendChild(span);
                });
                if (wordIndex < words.length - 1) { fragment.appendChild(document.createTextNode(' ')); }
            });
            target.textContent = '';
            target.appendChild(fragment);
        };
        var animateShadow = function (target) {
            if (!target || reduced) { return; }
            prepareShadow(target);
            target.classList.remove('is-animated');
            /* Reflow erzwingen, damit die Animation neu startet */
            void target.offsetWidth;
            target.classList.add('is-animated');
        };

        /* ------------------------------------------------------------------
           Hero
           ------------------------------------------------------------------ */
        safe('hero', function () {
            var hero = q('.hpp-hero');
            var video = q('.hpp-hero__video');
            var content = q('.hpp-hero__content');

            /* Der Text blendet sofort ein und wartet nicht auf das Video */
            if (hero) { void hero.offsetWidth; }
            root.classList.add('hpp--intro');
            if (!hero) { return; }

            if (video) {
                var showVideo = function () { root.classList.add('hpp--video'); };
                var split = function (value) {
                    return (value || '').split('|')
                        .map(function (source) { return source.trim(); })
                        .filter(Boolean);
                };
                var list = split(video.getAttribute('data-hpp-videos'));
                var light = split(video.getAttribute('data-hpp-videos-light'));
                /* Am Handy und bei langsamer Verbindung nur die kleinen Videos */
                if (light.length && (slowNet || isPhone())) { list = light; }

                /* Im Datensparmodus bleibt es beim Farbverlauf */
                if (list.length && !saveData) {
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

                    video.muted = true;
                    video.setAttribute('playsinline', '');
                    video.setAttribute('webkit-playsinline', '');
                    /* Erst einblenden, wenn wirklich ein Bild da ist – sonst bleibt der Farbverlauf stehen */
                    video.addEventListener('loadeddata', showVideo, { once: true });
                    win.setTimeout(function () {
                        if (video.readyState >= 2) { showVideo(); }
                    }, 4000);
                    video.preload = reduced ? 'metadata' : 'auto';
                    video.src = pick;

                    if (!reduced) {
                        play(video);
                        /* Außerhalb des Bildschirms pausieren: spart Akku und Rechenzeit */
                        if (hasIO) {
                            new win.IntersectionObserver(function (entries) {
                                if (entries[entries.length - 1].isIntersecting) {
                                    play(video);
                                } else {
                                    video.pause();
                                }
                            }).observe(hero);
                        }
                    }
                }
            }

            /* Text wandert beim Scrollen leicht nach oben */
            if (content && !reduced) {
                var lastShift = -1;
                frameTasks.push(function () {
                    var rect = hero.getBoundingClientRect();
                    if (rect.bottom < -80 || rect.top > win.innerHeight) { return; }
                    var progress = Math.round(clamp(-rect.top / (rect.height || 1), 0, 1) * 1000) / 1000;
                    if (progress !== lastShift) {
                        lastShift = progress;
                        content.style.transform = progress > 0
                            ? 'translate3d(0, ' + (-25 * progress).toFixed(2) + '%, 0)'
                            : '';
                    }
                });
            }
        });

        /* ------------------------------------------------------------------
           Schritt-Slider
           ------------------------------------------------------------------ */
        safe('slider', function () {
            var slider = q('#hpp-process-slider');
            if (!slider) { return; }
            var viewport = q('.hpp-slider__viewport', slider);
            var track = q('.hpp-slider__track', slider);
            var slides = qa('.hpp-slide', slider);
            var fill = q('.hpp-slider__progress-fill', slider);
            var buttons = qa('.hpp-slider__btn', slider);
            if (!viewport || !track || !slides.length) { return; }

            var total = slides.length;
            var videos = slides.map(function (slide) { return q('.hpp-slide__video', slide); });
            var active = 0;
            var inView = !hasIO;
            var armed = false;
            var firstViewDone = false;

            viewport.setAttribute('tabindex', '0');
            slides.forEach(function (slide, index) {
                var title = q('.hpp-slide__title', slide);
                var text = q('.hpp-slide__text', slide);
                /* Weiche Trennstriche aus dem Titel nicht mit vorlesen lassen */
                var label = title && title.textContent
                    ? title.textContent.replace(/\u00AD/g, '').trim()
                    : 'Prozessschritt ' + (index + 1);
                slide.setAttribute('tabindex', '0');
                slide.setAttribute('role', 'group');
                slide.setAttribute('aria-roledescription', 'slide');
                slide.setAttribute('aria-label', 'Schritt ' + (index + 1) + ' von ' + total + ': ' + label);
                if (text) {
                    text.setAttribute('data-hpp-shadow', 'manual');
                    prepareShadow(text);
                }
                if (videos[index]) {
                    videos[index].setAttribute('aria-label', label);
                    videos[index].setAttribute('title', label);
                }
            });

            /* --- Videos: erst laden, wenn der Slider in die Nähe kommt --- */
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
                if (inView && videos[active]) { play(videos[active]); }
            };

            /* --- Aktiver Schritt --- */
            var setActive = function (index, force) {
                var next = clamp(index, 0, total - 1);
                if (!force && next === active && slides[next].getAttribute('data-active') === 'true') { return; }
                active = next;
                slides.forEach(function (slide, slideIndex) {
                    var isActive = slideIndex === active;
                    var video = videos[slideIndex];
                    slide.setAttribute('data-active', isActive ? 'true' : 'false');
                    if (video) {
                        if (isActive) {
                            if (armed) {
                                warmNeighbours(active);
                                restart(video);
                                if (inView) { play(video); }
                            }
                        } else {
                            video.pause();
                        }
                    }
                    if (!isActive) {
                        qa('[data-hpp-shadow]', slide).forEach(function (element) {
                            element.classList.remove('is-animated');
                        });
                    }
                });
            };
            var animateSlideText = function (slide) {
                var text = slide ? q('.hpp-slide__text[data-hpp-shadow]', slide) : null;
                if (text) { animateShadow(text); }
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
                    var current = Math.abs(position - value);
                    if (current < distance) { distance = current; best = index; }
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
                if (dirty || !positions.length) { computePositions(); }
                var target = clamp(index, 0, total - 1);
                var to = clamp(positions[target] || 0, 0, maxOffset());
                if (snap) { snap.kill(); }
                snap = tween(position, to, reduced ? 0 : 350, render, function () {
                    snap = null;
                    setActive(target, force);
                    if (inView) { animateSlideText(slides[target]); }
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

            /* --- Sichtbarkeit: Videos nur abspielen, wenn der Slider zu sehen ist --- */
            var onFirstView = function () {
                if (firstViewDone) { return; }
                firstViewDone = true;
                animateSlideText(slides[active]);
            };
            if (hasIO) {
                new win.IntersectionObserver(function (entries) {
                    inView = entries.some(function (entry) { return entry.isIntersecting; });
                    if (!inView) {
                        videos.forEach(function (video) { if (video) { video.pause(); } });
                        return;
                    }
                    armVideos();
                    play(videos[active]);
                    onFirstView();
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
            if (!hasIO) {
                armVideos();
                onFirstView();
            }
        });

        /* ------------------------------------------------------------------
           Überschrift „So entsteht Hygienepapier"
           ------------------------------------------------------------------ */
        safe('headline', function () {
            var targets = qa('[data-hpp-shadow]').filter(function (target) {
                return target.getAttribute('data-hpp-shadow') !== 'manual';
            });
            if (!targets.length) { return; }
            targets.forEach(prepareShadow);
            if (reduced) { return; }
            if (!hasIO) { targets.forEach(animateShadow); return; }
            var observer = new win.IntersectionObserver(function (entries, self) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) { return; }
                    self.unobserve(entry.target);
                    win.setTimeout(function () { animateShadow(entry.target); }, 120);
                });
            }, { threshold: 0.35 });
            targets.forEach(function (target) { observer.observe(target); });
        });

        /* ------------------------------------------------------------------
           Shop: Karten-Szene
           ------------------------------------------------------------------ */
        safe('shop', function () {
            var section = q('.hpp-shop');
            if (!section) { return; }
            var scene = q('.hpp-shop__scene', section);
            var pin = q('.hpp-shop__pin', section);
            var wrap = q('.hpp-shop__rail-wrap', section);
            var rail = q('.hpp-shop__rail', section);
            var images = qa('.hpp-card__img', section);
            var ready = false;
            var setReady = function () {
                if (ready) { return; }
                ready = true;
                section.classList.add('is-ready');
            };
            /* Sicherheitsnetz: die Karten werden in jedem Fall sichtbar */
            if (!scene || !pin || !wrap || !rail || reduced) { setReady(); return; }

            var desktop = win.matchMedia('(min-width: 992px)');
            var supported = !!(win.CSS && win.CSS.supports
                && win.CSS.supports('overflow', 'clip')
                && win.CSS.supports('position', 'sticky'));
            var pinned = false;
            var travel = 0;
            var lastProgress = -1;

            /* „overflow: hidden" an einer Hülle macht position: sticky wirkungslos.
               „clip" schneidet genauso ab, lässt das Anpinnen aber zu. */
            var isOpen = function (value) { return value === 'visible' || value === 'clip'; };
            var freeAncestors = function () {
                var node = root.parentElement;
                while (node && node !== document.body && node !== document.documentElement) {
                    var style = win.getComputedStyle(node);
                    if (!isOpen(style.overflowX) || !isOpen(style.overflowY)) {
                        node.style.overflow = 'clip';
                        style = win.getComputedStyle(node);
                        if (!isOpen(style.overflowX) || !isOpen(style.overflowY)) { return false; }
                    }
                    node = node.parentElement;
                }
                var body = win.getComputedStyle(document.body);
                var html = win.getComputedStyle(document.documentElement);
                var bodyScrolls = !isOpen(body.overflowX) || !isOpen(body.overflowY);
                var htmlScrolls = !isOpen(html.overflowX) || !isOpen(html.overflowY);
                return !(bodyScrolls && htmlScrolls);
            };

            var clearMotion = function () {
                rail.style.transform = '';
                images.forEach(function (image) { image.style.transform = ''; });
                scene.style.removeProperty('--hpp-scene-scroll');
            };

            /* Szene vermessen. Sie lohnt sich nur, wenn die Karten in die Höhe passen
               und es seitlich etwas zu durchlaufen gibt. */
            var measureScene = function () {
                var last = rail.lastElementChild;
                var contentWidth = last ? last.offsetLeft + last.offsetWidth : 0;
                travel = Math.max(0, Math.round(contentWidth - wrap.clientWidth));
                if (travel < 24) { return false; }
                var paddingBottom = parseFloat(win.getComputedStyle(pin).paddingBottom) || 0;
                if (wrap.offsetTop + wrap.offsetHeight > pin.clientHeight - paddingBottom + 1) { return false; }
                /* Scrollweg: doppelter seitlicher Weg, mindestens ein halber, höchstens 1,6 Bildschirme */
                var height = pin.clientHeight;
                var distance = clamp(travel * 2, height * 0.5, height * 1.6);
                scene.style.setProperty('--hpp-scene-scroll', Math.round(distance) + 'px');
                return true;
            };

            var update = function () {
                var viewportHeight = win.innerHeight;
                if (!ready && section.getBoundingClientRect().top < viewportHeight * 0.85) { setReady(); }
                if (!pinned) { return; }

                var rect = scene.getBoundingClientRect();
                if (rect.bottom < -viewportHeight || rect.top > viewportHeight * 2) { return; }
                var top = measureTop();
                var distance = rect.height - pin.offsetHeight;
                var progress = distance > 0 ? clamp((top - rect.top) / distance, 0, 1) : 0;
                progress = Math.round(progress * 10000) / 10000;
                if (progress === lastProgress) { return; }
                lastProgress = progress;
                /* Direkt als transform gesetzt: läuft ohne Stil-Neuberechnung der Karteninhalte */
                rail.style.transform = 'translate3d(' + (-travel * progress).toFixed(1) + 'px, 0, 0)';
                var shift = 'translate3d(' + (-6 * progress).toFixed(2) + '%, 0, 0)';
                images.forEach(function (image) { image.style.transform = shift; });
            };

            var applyMode = function () {
                var next = supported && desktop.matches && freeAncestors();
                if (next) {
                    /* Szene probeweise einschalten und vermessen (noch im selben Bild, also unsichtbar) */
                    root.classList.add('hpp--pin');
                    root.classList.remove('hpp--compact');
                    rail.style.transform = '';
                    measureTop();
                    next = measureScene();
                    if (!next && travel >= 24) {
                        /* Passt es in der Höhe nicht: zweiter Versuch mit flacheren Bildern */
                        root.classList.add('hpp--compact');
                        next = measureScene();
                    }
                }
                pinned = next;
                root.classList.toggle('hpp--pin', pinned);
                if (!pinned) {
                    root.classList.remove('hpp--compact');
                    clearMotion();
                }
                lastProgress = -1;
                update();
            };

            var modeQueued = false;
            var queueMode = function () {
                if (modeQueued) { return; }
                modeQueued = true;
                raf(function () { modeQueued = false; applyMode(); });
            };

            frameTasks.push(update);
            applyMode();
            win.addEventListener('resize', queueMode);
            win.addEventListener('load', applyMode);
            if (document.fonts && document.fonts.ready) { document.fonts.ready.then(queueMode); }
            if (typeof desktop.addEventListener === 'function') {
                desktop.addEventListener('change', applyMode);
            } else if (typeof desktop.addListener === 'function') {
                desktop.addListener(applyMode);
            }
        });

        /* Kartentitel (Touch-Geräte): bei Bedarf verkleinern, bis sie in die Karte passen */
        safe('card-titles', function () {
            var overlays = qa('.hpp-card__overlay');
            if (!overlays.length) { return; }
            var fit = function () {
                overlays.forEach(function (overlay) {
                    var title = q('.hpp-card__title', overlay);
                    if (!title) { return; }
                    title.style.fontSize = '';
                    var style = win.getComputedStyle(overlay);
                    var available = overlay.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
                    var size = parseFloat(win.getComputedStyle(title).fontSize);
                    if (!(available > 0) || !isFinite(size)) { return; }
                    while (size > 11.5 && title.scrollWidth > available) {
                        size -= 1;
                        title.style.fontSize = size + 'px';
                    }
                });
            };
            var queued = false;
            var schedule = function () {
                if (queued) { return; }
                queued = true;
                raf(function () { queued = false; fit(); });
            };
            fit();
            if (document.fonts && document.fonts.ready) { document.fonts.ready.then(schedule); }
            win.addEventListener('load', schedule);
            win.addEventListener('resize', schedule);
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
                }, 420);
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
        var onResize = function () {
            measurePageTop();
            measureTop();
            requestFrame();
        };
        win.addEventListener('scroll', requestFrame, { passive: true });
        win.addEventListener('resize', onResize);
        win.addEventListener('load', onResize);
        measurePageTop();
        measureTop();
        runFrame();
    };

    if (document.getElementById(ROOT_ID)) {
        boot();
    } else {
        document.addEventListener('DOMContentLoaded', boot);
    }
})();
