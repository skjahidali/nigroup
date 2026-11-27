import { initializeFormSubmissions } from './form-submissions.js';

function initMobileNavigation() {
    const header = document.getElementById('header');
    const menuToggle = document.getElementById('menuToggle');
    const navMobile = document.getElementById('navMobile');

    const closeMenu = () => {
        if (!navMobile || !menuToggle) return;
        navMobile.classList.remove('active', 'open');
        header?.classList.remove('nav-open');
        document.body.classList.remove('nav-menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.innerHTML = '&#9776;';
    };

    if (menuToggle && navMobile) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = !navMobile.classList.contains('active');
            navMobile.classList.toggle('active', isOpen);
            navMobile.classList.toggle('open', isOpen);
            header?.classList.toggle('nav-open', isOpen);
            document.body.classList.toggle('nav-menu-open', isOpen);
            menuToggle.setAttribute('aria-expanded', String(isOpen));
            menuToggle.innerHTML = isOpen ? '&#10005;' : '&#9776;';
        });

        document.addEventListener('click', (e) => {
            if (navMobile.classList.contains('active') && !navMobile.contains(e.target) && !menuToggle.contains(e.target)) {
                closeMenu();
            }
        });

        navMobile.querySelectorAll('a.nav-link').forEach((link) => {
            link.addEventListener('click', () => closeMenu());
        });
    }

    document.querySelectorAll('.mobile-dropdown-toggle').forEach((toggle) => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const subMenu = toggle.nextElementSibling;
            const expanded = toggle.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(expanded));
            if (subMenu) {
                subMenu.classList.toggle('open', expanded);
            }
        });
    });
}

function initHeaderAndSmoothScroll() {
    const header = document.getElementById('header');
    const updateHeader = () => {
        if (!header) return;
        if (window.scrollY > 36) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            const headerOffset = header ? header.offsetHeight + 12 : 84;
            const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
            window.scrollTo({
                top: Math.max(0, top),
                behavior: 'smooth'
            });
        });
    });
}

function initScrollAnimations() {
    document.documentElement.classList.add('js-enabled');
    const selector = '.project-card, .service-card, .director-card, .step-card, .section-header, .value-card, .wj-card, .blog-card, .amenity-card, .pii-item, .project-detail-item';
    const elements = Array.from(document.querySelectorAll(selector));
    if (!elements.length) return;

    const activate = (el) => el.classList.add('active', 'in-view');

    if (!('IntersectionObserver' in window)) {
        elements.forEach(activate);
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    activate(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    );

    elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.95) {
            activate(el);
        } else {
            observer.observe(el);
        }
    });

    // Guarantee all elements become visible even if scroll events are throttled
    setTimeout(() => elements.forEach(activate), 1200);
}

function extractImageUrl(el) {
    if (!el) return '';
    if (el.tagName === 'IMG') {
        return el.currentSrc || el.getAttribute('src') || '';
    }
    const inlineBg = el.style?.backgroundImage || window.getComputedStyle(el).backgroundImage || '';
    const match = inlineBg.match(/url\(["']?(.*?)["']?\)/i);
    return match ? match[1] : '';
}

function initProjectGalleryAndCarousels() {
    // 1. Amenities Carousel
    const amenitiesGrid = document.getElementById('amenitiesGrid');
    let amenityIndex = 0;

    const updateAmenitiesPosition = () => {
        if (!amenitiesGrid) return;
        const cards = amenitiesGrid.querySelectorAll('.amenity-card');
        if (!cards.length) return;
        const containerWidth = amenitiesGrid.parentElement?.clientWidth || window.innerWidth;
        const cardWidth = cards[0].offsetWidth + 14;
        const visibleCount = Math.max(1, Math.floor(containerWidth / cardWidth));
        const maxIndex = Math.max(0, cards.length - visibleCount);
        amenityIndex = Math.max(0, Math.min(amenityIndex, maxIndex));

        if (window.innerWidth <= 768 && amenitiesGrid.parentElement) {
            amenitiesGrid.parentElement.scrollTo({ left: amenityIndex * cardWidth, behavior: 'smooth' });
        } else {
            amenitiesGrid.style.transform = `translateX(-${amenityIndex * cardWidth}px)`;
        }
    };

    window.prevAmenities = () => {
        amenityIndex -= 1;
        updateAmenitiesPosition();
    };
    window.nextAmenities = () => {
        amenityIndex += 1;
        updateAmenitiesPosition();
    };

    // 2. Project Photo Gallery Carousel + Lightbox
    const galleryGrid = document.getElementById('galleryGrid');
    const galleryDots = document.getElementById('galleryDots');
    const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));

    let galleryIndex = 0;

    const updateGalleryPosition = () => {
        if (!galleryGrid || !galleryItems.length) return;
        const containerWidth = galleryGrid.parentElement?.clientWidth || window.innerWidth;
        const itemWidth = galleryItems[0].offsetWidth + 14;
        const visibleCount = Math.max(1, Math.floor(containerWidth / itemWidth));
        const maxIndex = Math.max(0, galleryItems.length - visibleCount);

        if (galleryIndex > maxIndex) galleryIndex = 0;
        if (galleryIndex < 0) galleryIndex = maxIndex;

        if (window.innerWidth <= 768 && galleryGrid.parentElement) {
            galleryGrid.parentElement.scrollTo({ left: galleryIndex * itemWidth, behavior: 'smooth' });
        } else {
            galleryGrid.style.transform = `translateX(-${galleryIndex * itemWidth}px)`;
        }

        if (galleryDots) {
            galleryDots.querySelectorAll('.gallery-dot').forEach((dot, idx) => {
                dot.classList.toggle('active', idx === galleryIndex);
            });
        }
    };

    if (galleryDots && galleryItems.length > 1) {
        galleryDots.innerHTML = '';
        galleryItems.forEach((_, idx) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'gallery-dot' + (idx === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
            dot.addEventListener('click', () => {
                galleryIndex = idx;
                updateGalleryPosition();
            });
            galleryDots.appendChild(dot);
        });
    }

    window.prevGallery = () => {
        galleryIndex -= 1;
        updateGalleryPosition();
    };
    window.nextGallery = () => {
        galleryIndex += 1;
        updateGalleryPosition();
    };

    window.addEventListener('resize', () => {
        updateAmenitiesPosition();
        updateGalleryPosition();
    }, { passive: true });

    // 3. Fullscreen Lightbox for all Gallery Items (supports background-image divs & <img>)
    if (galleryItems.length) {
        const slides = galleryItems
            .map((item, idx) => ({
                src: extractImageUrl(item),
                caption: item.getAttribute('aria-label') || item.querySelector('img')?.alt || `Project Photo ${idx + 1}`,
                el: item
            }))
            .filter(s => Boolean(s.src));

        if (slides.length) {
            let lightboxIdx = 0;
            const lightbox = document.createElement('div');
            lightbox.className = 'ni-gallery-lightbox';
            lightbox.setAttribute('role', 'dialog');
            lightbox.setAttribute('aria-modal', 'true');
            lightbox.innerHTML = `
                <button type="button" class="ni-lightbox-close" aria-label="Close gallery">&times;</button>
                ${slides.length > 1 ? '<button type="button" class="ni-lightbox-prev" aria-label="Previous image">&#10094;</button>' : ''}
                <img src="" alt="">
                <p class="ni-lightbox-caption"></p>
                ${slides.length > 1 ? '<button type="button" class="ni-lightbox-next" aria-label="Next image">&#10095;</button>' : ''}
            `;
            document.body.appendChild(lightbox);

            const lbImg = lightbox.querySelector('img');
            const lbCaption = lightbox.querySelector('.ni-lightbox-caption');

            const openLightbox = (idx) => {
                lightboxIdx = (idx + slides.length) % slides.length;
                lbImg.src = slides[lightboxIdx].src;
                lbImg.alt = slides[lightboxIdx].caption;
                lbCaption.textContent = `${slides[lightboxIdx].caption} (${lightboxIdx + 1} / ${slides.length})`;
                lightbox.classList.add('open');
                document.body.style.overflow = 'hidden';
            };

            const closeLightbox = () => {
                lightbox.classList.remove('open');
                document.body.style.overflow = '';
            };

            slides.forEach((slide, idx) => {
                slide.el.addEventListener('click', () => openLightbox(idx));
            });

            lightbox.querySelector('.ni-lightbox-close')?.addEventListener('click', closeLightbox);
            lightbox.querySelector('.ni-lightbox-prev')?.addEventListener('click', (e) => {
                e.stopPropagation();
                openLightbox(lightboxIdx - 1);
            });
            lightbox.querySelector('.ni-lightbox-next')?.addEventListener('click', (e) => {
                e.stopPropagation();
                openLightbox(lightboxIdx + 1);
            });
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) closeLightbox();
            });

            document.addEventListener('keydown', (e) => {
                if (!lightbox.classList.contains('open')) return;
                if (e.key === 'Escape') closeLightbox();
                if (e.key === 'ArrowLeft') openLightbox(lightboxIdx - 1);
                if (e.key === 'ArrowRight') openLightbox(lightboxIdx + 1);
            });
        }
    }
}

function initAIChatbotAndPopups() {
    window.toggleAI = () => {
        const panel = document.getElementById('aiPanel');
        if (!panel) return;
        const isOpen = panel.classList.toggle('open');
        panel.style.display = isOpen ? 'flex' : 'none';
        document.body.classList.toggle('ai-open', isOpen);
    };

    const appendMsg = (text, sender) => {
        const body = document.getElementById('aiBody');
        if (!body) return;
        const msg = document.createElement('div');
        msg.className = `ai-msg ${sender}`;
        msg.textContent = text;
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;
    };

    window.askAI = (topic) => {
        appendMsg(topic, 'user');
        const replies = {
            'Available Projects': 'NI Group projects: INVICTA (Ready to Move), INAYA Residency (Under Construction), and upcoming launches IRIS, IQRA, Paradizia, INARA Metro & IRA Residency across Newtown & Hatiara.',
            'Book Site Visit': 'Schedule a free guided site visit by calling 9330118686 or messaging us on WhatsApp.',
            'Price Details': 'Competitive pricing across 1, 2 & 3 BHK apartments and plots. Download the project brochure or call 9330118686 for exact unit quotes.',
            'Floor Plans': 'Detailed 1, 2 & 3 BHK floor plans are included in each project brochure — submit the brochure form on this page to download instantly.',
            'Office Location': 'Ground Floor, New Sunrise Apartment, Swami Vivekananda Road, Hatiara, Newtown, Kolkata – 700157.'
        };
        setTimeout(() => {
            appendMsg(replies[topic] || 'Thank you for contacting NI Group! Please call 9330118686 or WhatsApp us for immediate assistance.', 'bot');
        }, 280);
    };

    window.sendAI = () => {
        const input = document.getElementById('aiInput');
        if (!input || !input.value.trim()) return;
        const text = input.value.trim();
        input.value = '';
        window.askAI(text);
    };

    window.openPopup = () => {
        const popup = document.getElementById('leadPopup');
        if (popup) popup.classList.add('show');
    };

    window.closePopup = () => {
        const popup = document.getElementById('leadPopup');
        if (popup) popup.classList.remove('show');
    };
}


function initHomepagePopupAndTestimonials() {
    const popup = document.getElementById('leadPopup');
    if (popup) {
        // Close on backdrop click or Escape key
        popup.addEventListener('click', (e) => {
            if (e.target === popup && typeof window.closePopup === 'function') {
                window.closePopup();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && popup.classList.contains('show') && typeof window.closePopup === 'function') {
                window.closePopup();
            }
        });

        // Auto-open landing page popup after 3.5 seconds (once per session)
        try {
            if (!sessionStorage.getItem('ni_lead_popup_shown')) {
                setTimeout(() => {
                    if (!popup.classList.contains('show')) {
                        window.openPopup?.();
                        sessionStorage.setItem('ni_lead_popup_shown', '1');
                    }
                }, 3500);
            }
        } catch (_) {
            setTimeout(() => window.openPopup?.(), 3500);
        }
    }

    // Testimonials carousel navigation on index.html
    window.moveTestimonials = (direction) => {
        const carousel = document.getElementById('testimonialCarousel');
        if (!carousel) return;
        const card = carousel.querySelector('.testimonial-card');
        const step = card ? card.offsetWidth + 24 : 360;
        carousel.scrollBy({ left: direction * step, behavior: 'smooth' });
    };
}

document.addEventListener('DOMContentLoaded', () => {
    initHomepagePopupAndTestimonials();
    initMobileNavigation();
    initHeaderAndSmoothScroll();
    initScrollAnimations();
    initProjectGalleryAndCarousels();
    initAIChatbotAndPopups();
    initializeFormSubmissions();
});

import { initializeFormSubmissions } from './form-submissions.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeFormSubmissions();

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const navMobile = document.getElementById('navMobile');
    if (menuToggle && navMobile) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navMobile.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', String(isOpen));
            menuToggle.innerHTML = isOpen ? '&#10005;' : '&#9776;';
        });

        document.addEventListener('click', (e) => {
            if (navMobile.classList.contains('active') && !navMobile.contains(e.target) && e.target !== menuToggle) {
                navMobile.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
                menuToggle.innerHTML = '&#9776;';
            }
        });
    }

    // Mobile Submenu Accordion
    document.querySelectorAll('.mobile-dropdown-toggle').forEach((toggle) => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const wrap = toggle.closest('.nav-link-wrap');
            const subMenu = wrap?.querySelector('.mobile-sub-menu');
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!expanded));
            wrap?.classList.toggle('open', !expanded);
            subMenu?.classList.toggle('open', !expanded);
        });
    });
});
