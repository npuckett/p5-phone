(function() {
  const CF = window.P5PHONE_CATALOG_FILTERS;

  function closeMenu() {
    document.body.classList.remove('menu-open');
    const button = document.querySelector('[data-menu-button]');
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    const isOpen = document.body.classList.toggle('menu-open');
    const button = document.querySelector('[data-menu-button]');
    if (button) button.setAttribute('aria-expanded', String(isOpen));
  }

  function setupMenu() {
    const button = document.querySelector('[data-menu-button]');
    const backdrop = document.querySelector('[data-backdrop]');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    if (button) button.addEventListener('click', toggleMenu);
    if (backdrop) backdrop.addEventListener('click', closeMenu);
    navLinks.forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  function setupActiveSection() {
    const links = Array.from(document.querySelectorAll('.sidebar-nav a'));
    const sections = links
      .map(link => document.getElementById(CF.sectionIdFromHref(link.getAttribute('href'))))
      .filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          link.classList.toggle('active', CF.sectionIdFromHref(link.getAttribute('href')) === entry.target.id);
        });
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0.01 });
    sections.forEach(section => observer.observe(section));
  }

  document.addEventListener('DOMContentLoaded', function() {
    setupMenu();
    setupActiveSection();
  });
})();