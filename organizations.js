const form = document.querySelector('#org-form');
const status = document.querySelector('#form-status');

form.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = 'Sending…';
  status.classList.remove('error');

  const payload = {
    contactName: form.contactName.value.trim(),
    orgName: form.orgName.value.trim(),
    contactEmail: form.contactEmail.value.trim(),
    contactPhone: form.contactPhone.value.trim(),
    vibe: form.vibe.value.trim(),
    bestTime: form.bestTime.value.trim()
  };

  try {
    const response = await fetch('/api/organization-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Request failed');
    form.reset();
    status.textContent = 'Your email app should open with this request addressed to info@vbimpact.org. Send it from there to finish.';
  } catch {
    status.textContent = 'Something went wrong. Please try again.';
    status.classList.add('error');
  }
});
