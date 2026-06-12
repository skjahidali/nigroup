document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.header');
    const menuToggle = document.getElementById('menuToggle');
    const navMobile = document.getElementById('navMobile');

    const headerLogo = document.getElementById('headerLogo');
    const defaultHeaderLogoSrc = headerLogo?.dataset.defaultSrc;
    const coloredHeaderLogoSrc = headerLogo?.dataset.coloredSrc;

    const updateHeader = () => {
        const isScrolled = window.scrollY > 60;

        if (header) {
            header.classList.toggle('scrolled', isScrolled);
        }

        if (headerLogo && defaultHeaderLogoSrc && coloredHeaderLogoSrc) {
            headerLogo.src = isScrolled ? coloredHeaderLogoSrc : defaultHeaderLogoSrc;
        }
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('load', updateHeader);

    // Mobile menu toggle
    if (menuToggle && navMobile) {
        menuToggle.addEventListener('click', () => {
            const isOpen = navMobile.classList.toggle('active');

            menuToggle.setAttribute('aria-expanded', String(isOpen));
            menuToggle.innerHTML = isOpen
                ? '<span class="menu-icon">×</span>'
                : '<span class="menu-icon">☰</span>';

            if (header) header.classList.toggle('nav-open', isOpen);
        });

        navMobile.querySelectorAll('.nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                navMobile.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
                menuToggle.innerHTML = '<span class="menu-icon">☰</span>';
                if (header) header.classList.remove('nav-open');
            });
        });
    }

    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const firstName = newsletterForm.querySelector('input[type="text"]')?.value?.trim();
            const email = newsletterForm.querySelector('input[type="email"]')?.value?.trim();

            if (firstName && email) {
                alert(`Thank you, ${firstName}! You're now subscribed.`);
                newsletterForm.reset();
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Scroll animation fix for live domain
    document.body.classList.add('js-enabled');

    const revealItems = document.querySelectorAll(
        '.animated-step, .project-card, .service-card, .director-card, .stat, .carousel-item, .testimonial-card, .vision-card, .mission-card, .section-header'
    );

    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                    }
                });
            },
            {
                threshold: 0.12,
                rootMargin: '0px 0px -30px 0px',
            }
        );

        revealItems.forEach((item) => revealObserver.observe(item));
    } else {
        revealItems.forEach((item) => item.classList.add('active'));
    }
});

function moveTestimonials(direction) {
    const carousel = document.getElementById('testimonialCarousel');
    if (!carousel) return;

    const card = carousel.querySelector('.testimonial-card');
    if (!card) return;

    const gap = parseInt(window.getComputedStyle(carousel).gap, 10) || 20;
    const cardWidth = card.offsetWidth + gap;

    carousel.scrollBy({
        left: direction * cardWidth,
        behavior: 'smooth'
    });
}

window.moveTestimonials = moveTestimonials;


