document.addEventListener('DOMContentLoaded', () => {
    const header     = document.querySelector('.header');
    const menuToggle = document.getElementById('menuToggle');
    const navMobile  = document.getElementById('navMobile');

    /* ── Header scroll state ── */
    const updateHeader = () => {
        const scrolled = window.scrollY > 60;
        header?.classList.toggle('scrolled', scrolled);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });

    /* ── Mobile menu ── */
    if (menuToggle && navMobile) {
        menuToggle.addEventListener('click', () => {
            const isOpen = navMobile.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', String(isOpen));
            menuToggle.textContent = isOpen ? '×' : '☰';
            header?.classList.toggle('nav-open', isOpen);
        });

        navMobile.querySelectorAll('.nav-link:not(.mobile-dropdown-toggle)').forEach(link => {
            link.addEventListener('click', () => {
                navMobile.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
                menuToggle.textContent = '☰';
                header?.classList.remove('nav-open');
            });
        });
    }

    /* ── Smooth scroll (anchor links only) ── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;
            try {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } catch (err) {
                console.warn(`Invalid selector: ${href}`, err);
            }
        });
    });

    /* ── Desktop dropdown ── */
    document.querySelectorAll('.nav-dropdown').forEach(dd => {
        const menu = dd.querySelector('.nav-dropdown-menu');
        if (!menu) return;
        let timer;
        dd.addEventListener('mouseenter', () => {
            clearTimeout(timer);
            dd.classList.add('open');
        });
        dd.addEventListener('mouseleave', () => {
            timer = setTimeout(() => dd.classList.remove('open'), 150);
        });
    });

    /* ── Mobile dropdown ── */
    document.querySelectorAll('.mobile-dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const sub = toggle.closest('.nav-link-wrap')?.querySelector('.mobile-sub-menu');
            if (sub) {
                const isOpen = sub.classList.toggle('open');
                toggle.querySelector('.m-chevron')?.style.setProperty('transform', isOpen ? 'rotate(180deg)' : 'rotate(0)');
            }
        });
    });

    /* ── Active nav highlight ── */
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = [];
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            const sec = document.querySelector(href);
            if (sec) sections.push({ link, sec });
        }
    });

    if (sections.length) {
        const activateNav = () => {
            const y = window.scrollY + window.innerHeight * 0.35;
            let current = null;
            sections.forEach(({ sec }) => {
                if (sec.offsetTop <= y) current = sec.id;
            });
            sections.forEach(({ link, sec }) => {
                link.classList.toggle('active', sec.id === current);
            });
        };
        window.addEventListener('scroll', activateNav, { passive: true });
        activateNav();
    }

    /* ── Scroll reveal ── */
    document.body.classList.add('js-enabled');

    const revealItems = document.querySelectorAll(
        '.animated-step, .project-card, .service-card, .director-card, .step-card, .section-header'
    );

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
        revealItems.forEach(item => observer.observe(item));
    } else {
        revealItems.forEach(item => item.classList.add('active'));
    }

    /* ── Lead popup (delay 3s) ── */
    setTimeout(() => {
        document.getElementById('leadPopup')?.classList.add('show');
    }, 3000);

    /* ── Dynamic Copyright Year ── */
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }
});

/* ── Popup close ── */
function closePopup() {
    document.getElementById('leadPopup')?.classList.remove('show');
}

/* ── Testimonial carousel ── */
function moveTestimonials(direction) {
    const carousel = document.getElementById('testimonialCarousel');
    if (!carousel) return;
    const card = carousel.querySelector('.testimonial-card');
    if (!card) return;
    const gap = parseInt(window.getComputedStyle(carousel).gap, 10) || 24;
    carousel.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: 'smooth' });
}

/* ── AI Chatbot ── */
function toggleAI() {
    const panel = document.getElementById('aiPanel');
    if (!panel) return;
    const wrapper = panel.closest('.ni-ai-agent');
    const isOpen = panel.style.display === 'block' || panel.classList.contains('open');
    if (isOpen) {
        panel.style.display = 'none';
        panel.classList.remove('open');
        wrapper?.classList.remove('open');
        document.body.classList.remove('ai-open');
        // restore page scroll
        document.documentElement.style.overflow = '';
    } else {
        panel.style.display = 'block';
        panel.classList.add('open');
        wrapper?.classList.add('open');
        // on small screens lock background scroll for focused chat
        if (window.innerWidth <= 900) {
            document.body.classList.add('ai-open');
            document.documentElement.style.overflow = 'hidden';
        }
        const input = document.getElementById('aiInput');
        setTimeout(() => input?.focus(), 200);
    }
}

function askAI(text) {
    addMsg(text, 'user');
    showTyping();
    setTimeout(() => {
        hideTyping();
        addMsg(replyAI(text), 'bot');
    }, 580);
}

function sendAI() {
    const input = document.getElementById('aiInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg(text, 'user');
    showTyping();
    setTimeout(() => {
        hideTyping();
        addMsg(replyAI(text), 'bot');
    }, 650);
}

function addMsg(text, type) {
    const body = document.getElementById('aiBody');
    if (!body) return;
    const div = document.createElement('div');
    div.className = 'ai-msg ' + type;
    div.innerHTML = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

let typingEl = null;

function showTyping() {
    const body = document.getElementById('aiBody');
    if (!body || typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'ai-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(typingEl);
    body.scrollTop = body.scrollHeight;
}

function hideTyping() {
    if (typingEl) {
        typingEl.remove();
        typingEl = null;
    }
}

function replyAI(text) {
    const t = String(text || '').toLowerCase().trim();

    /* ── Greetings ── */
    if (t.includes('salam') || t.includes('assalamu'))
        return '🤲 Wa Alaikum Assalam! Welcome to <b>NI Group</b>. How may I assist you today?';
    if (t.match(/\b(hi|hello|hey|good morning|good afternoon|good evening)\b/))
        return '👋 Welcome to <b>NI Group</b> — your trusted real estate partner in Kolkata! Ask me about projects, pricing, site visits, or home loans.';
    if (t.includes('how are you'))
        return '😊 Doing great, alhamdulillah! How can I help you find your dream home today?';
    if (t.includes('bye') || t.includes('allah hafiz'))
        return '🤲 Allah Hafiz! Thank you for visiting NI Group. Have a wonderful day!';
    if (t.includes('thank'))
        return '😊 You are most welcome! NI Group is always here to assist you.';

    /* ── Company ── */
    if (t.includes('director') || t.includes('owner') || t.includes('founder') || t.includes('ataur') || t.includes('mokim'))
        return '👨‍💼 NI Group is led by <b>Saikh Ataur Rahaman</b> &amp; <b>MD Mokim Sardar</b> — visionary directors passionate about quality homes and transparent dealings.';
    if (t.includes('about') || t.includes('company') || t.includes('ni group'))
        return '🏢 <b>NI Group</b> is a trusted real estate developer in Kolkata with <b>10+ years</b> of legacy, <b>6+ own projects</b>, and <b>500+ happy families</b>. Visit <a href="about.html">our About page</a> for more.';

    /* ── Projects ── */
    if (t.includes('project') || t.includes('available flat') || t.includes('all project'))
        return '🏢 Our projects:<br><b>INVICTA</b> (Kalikapur – Completed), <b>IRIS</b>, <b>IQRA</b>, <b>INAYA Residency</b>, <b>INARA Metro</b>, <b>IRA Residency</b>, <b>Paradizia</b> (all Upcoming). Share your budget &amp; area for a recommendation!';
    if (t.includes('invicta'))
        return '🏗️ <b>INVICTA</b> — Completed project at Kalikapur, Newtown. Premium residential apartments. Call <b>9330118686</b> for resale/availability details.';
    if (t.includes('iris'))
        return '🏗️ <b>IRIS</b> — Upcoming premium residency in Kolkata. Elegance in every detail. Enquire now for pre-launch pricing.';
    if (t.includes('iqra'))
        return '🏗️ <b>IQRA</b> — Upcoming at Hatiara, Newtown. Modern residential apartments. Contact us for pre-launch offers.';
    if (t.includes('inara'))
        return '🏗️ <b>INARA Metro</b> — Metro-adjacent residency at Hatiara, Newtown. Upcoming. Great connectivity to the city.';
    if (t.includes('inaya'))
        return '🏗️ <b>INAYA Residency</b> — Upcoming gated community at Hatiara, Newtown. Peaceful, green surroundings.';
    if (t.includes('ira'))
        return '🏗️ <b>IRA Residency</b> — Upcoming luxury residency in Kolkata. Where serenity lives. Call us for details.';
    if (t.includes('paradizia'))
        return '🏗️ <b>Paradizia</b> — Upcoming gated community at Chapna, Newtown. "Where paradise begins."';

    /* ── Purchase Journey ── */
    if (t.includes('price') || t.includes('cost') || t.includes('rate') || t.includes('budget'))
        return '💰 Pricing varies by project, BHK size, and floor. Call <b>9330118686</b> or WhatsApp us for updated rates and exclusive offers.';
    if (t.includes('site visit') || t.includes('visit'))
        return '📅 To book a site visit, share your <b>Name, Mobile Number, Project Name &amp; Preferred Date</b> — our team will arrange everything for you!';
    if (t.includes('callback') || t.includes('call me') || t.includes('call back'))
        return '📞 Sure! Share your <b>Name, Mobile &amp; Preferred Time</b> and we\'ll call you back shortly.';
    if (t.includes('book') || t.includes('booking'))
        return '📝 Ready to book? Share your <b>Name, Mobile, Project &amp; BHK preference</b> and our sales team will guide you through the process.';
    if (t.includes('loan') || t.includes('emi') || t.includes('finance') || t.includes('home loan'))
        return '🏦 We assist with home loans through <b>SBI, HDFC, Axis Bank, PNB Housing, LIC HFL, Canara Bank</b> &amp; ICICI. Best rates guaranteed!';

    /* ── Info ── */
    if (t.includes('location') || t.includes('address') || t.includes('office') || t.includes('where'))
        return '📍 <b>NI Group Office:</b><br>Ground Floor, New Sunrise Apartment,<br>Swami Vivekananda Road, Hatiara, Newtown,<br>Kolkata – 700157';
    if (t.includes('whatsapp'))
        return '💬 <a href="https://wa.me/919330118686" target="_blank">WhatsApp Us</a> at <b>+91 93301 18686</b> — available 24/7!';
    if (t.includes('email'))
        return '📧 <a href="mailto:info@nigrouprealty.com">info@nigrouprealty.com</a><br><a href="mailto:sales@nigrouprealty.com">sales@nigrouprealty.com</a>';
    if (t.includes('contact') || t.includes('phone') || t.includes('number'))
        return '📞 <b>033 6902-8234</b> | <b>9330118686</b><br>Mon–Sat: 10:00 AM – 7:30 PM';
    if (t.includes('website') || t.includes('domain'))
        return '🌐 <a href="https://www.nigrouprealty.com" target="_blank">www.nigrouprealty.com</a>';
    if (t.includes('2 bhk'))
        return '🏠 2 BHK options available across select projects. Share your budget and preferred location — we\'ll find the best fit!';
    if (t.includes('3 bhk'))
        return '🏡 3 BHK spacious options for larger families. Tell us your preferred project and budget.';
    if (t.includes('floor plan') || t.includes('brochure'))
        return '📐 Share your WhatsApp number and we\'ll send the latest floor plans and brochure instantly!';
    if (t.includes('jv') || t.includes('joint venture') || t.includes('land owner') || t.includes('landowner'))
        return '🤝 NI Group welcomes JV opportunities with landowners. Share your land location and contact details with us.';
    if (t.includes('career') || t.includes('job') || t.includes('hiring'))
        return '💼 NI Group hires in Sales, Marketing, HR, IT, Design and Construction. Send your CV to <a href="mailto:info@nigrouprealty.com">info@nigrouprealty.com</a>.';
    if (t.includes('award') || t.includes('achievement') || t.includes('recognition'))
        return '🏆 NI Group has earned recognition as one of Kolkata\'s most trusted real estate developers, with 500+ happy families and 10+ years of excellence.';
    if (t.includes('amenity') || t.includes('amenities') || t.includes('facilities') || t.includes('feature'))
        return '🏊 Our projects offer world-class amenities — landscaped gardens, gym, community hall, children\'s play area, 24/7 security, power backup &amp; more!';
    if (t.includes('newtown') || t.includes('hatiara'))
        return '📍 We have multiple projects in the Hatiara–Newtown corridor — one of Kolkata\'s fastest-growing real estate destinations with great connectivity.';

    return '🤖 I can help with <b>projects, pricing, site visits, home loans, location &amp; booking</b>. Please ask your question or call <b>9330118686</b>.';
}

/* ── Custom Toast Notification ── */
function showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.style.cssText = 'background: #1e293b; color: #fff; padding: 14px 24px; border-radius: 10px; font-family: "Inter", sans-serif; font-size: 14px; font-weight: 500; box-shadow: 0 10px 25px rgba(0,0,0,0.2); opacity: 0; transform: translateY(20px); transition: all 0.3s ease; pointer-events: auto; border-left: 4px solid #16a34a;';
    toast.textContent = message;
    container.appendChild(toast);

    // Trigger reflow to enable transition
    toast.offsetHeight;

    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 4000);
}

/* ── Lead form submit ── */
function submitLead(e) {
    e.preventDefault();
    const form  = e.target;
    const btn   = form.querySelector('button[type="submit"]');
    btn.textContent = 'Submitting…';
    btn.disabled = true;
    setTimeout(() => {
        closePopup();
        form.reset();
        btn.textContent = 'Get Free Consultation →';
        btn.disabled = false;
        showToast('Thank you! Our team will contact you shortly.');
    }, 900);
}

/* ── Expose globals ── */
window.closePopup       = closePopup;
window.moveTestimonials = moveTestimonials;
window.toggleAI         = toggleAI;
window.askAI            = askAI;
window.sendAI           = sendAI;
window.submitLead       = submitLead;
window.showToast        = showToast;