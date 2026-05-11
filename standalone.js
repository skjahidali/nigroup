// Header scroll effect
const header = document.querySelector('.header');
const menuToggle = document.getElementById('menuToggle');
const navMobile = document.getElementById('navMobile');

const headerLogo = document.getElementById('headerLogo');
const defaultHeaderLogoSrc = headerLogo?.dataset.defaultSrc;
const coloredHeaderLogoSrc = headerLogo?.dataset.coloredSrc;

const updateHeaderLogo = () => {
    if (!headerLogo || !defaultHeaderLogoSrc || !coloredHeaderLogoSrc) return;
    const isScrolled = window.scrollY > 60;
    headerLogo.src = isScrolled ? coloredHeaderLogoSrc : defaultHeaderLogoSrc;
};

window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    updateHeaderLogo();
});

window.addEventListener('load', updateHeaderLogo);

// Mobile menu toggle
menuToggle.addEventListener('click', () => {
    navMobile.classList.toggle('active');
});

// Close menu when link is clicked
document.querySelectorAll('.nav-mobile .nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMobile.classList.remove('active');
    });
});

// Newsletter form
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const firstName = newsletterForm.querySelector('input[type="text"]').value;
        const email = newsletterForm.querySelector('input[type="email"]').value;

        if (firstName && email) {
            alert(`Thank you, ${firstName}! You're now subscribed.`);
            newsletterForm.reset();
        }
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
// Scroll animation fix for live domain
const revealItems = document.querySelectorAll(
  '.animated-step, .project-card, .service-card, .director-card, .stat, .carousel-item, .testimonial-card, .vision-card, .mission-card, .section-header'
);

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  },
  {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px',
  }
);

revealItems.forEach((item) => revealObserver.observe(item));
document.body.classList.add('js-enabled');