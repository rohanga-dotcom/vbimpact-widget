document.querySelectorAll('.nav-toggle').forEach(toggle => {
  const navigation = document.getElementById(toggle.getAttribute('aria-controls'));
  if (!navigation) return;

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', toggle.hasAttribute('data-admin-menu') ? 'Open admin navigation' : 'Open navigation');
    navigation.classList.remove('is-open');
  };

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.setAttribute('aria-label', expanded
      ? (toggle.hasAttribute('data-admin-menu') ? 'Open admin navigation' : 'Open navigation')
      : (toggle.hasAttribute('data-admin-menu') ? 'Close admin navigation' : 'Close navigation'));
    navigation.classList.toggle('is-open', !expanded);
  });

  navigation.addEventListener('click', event => {
    if (event.target.closest('a, .tab')) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  });
});
