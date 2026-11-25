const surveyQuestions = [
  {
    title: 'When do you<br>have some time?',
    choices: ['Weekday afternoons', 'Weekends', 'Flexible / varies', 'No preference']
  },
  {
    title: 'What causes<br>light you up?',
    choices: ['Animals & nature', 'Kids & education', 'Community care', 'Arts & culture']
  },
  {
    title: 'Where would you<br>like to volunteer?',
    choices: ['Outdoors', 'Indoors', 'Either is fine', 'No preference']
  },
  {
    title: 'How much time<br>can you commit?',
    choices: ['A few hours', 'A day each month', 'Weekly', 'It depends']
  }
];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

let homepageOpportunitiesRequest;
const getHomepageOpportunities = () => {
  if (!homepageOpportunitiesRequest) {
    homepageOpportunitiesRequest = fetch('/api/opportunities').then(response => {
      if (!response.ok) throw new Error('Failed to load opportunities');
      return response.json();
    });
  }
  return homepageOpportunitiesRequest;
};

const matchCard = document.querySelector('.match-card');
if (matchCard) {
  const title = matchCard.querySelector('h3');
  const choiceGrid = matchCard.querySelector('.choice-grid');
  const progressLabel = matchCard.querySelector('.card-top b');
  const progressBar = matchCard.querySelector('.progress i');
  const nextButton = matchCard.querySelector('#next-question');
  const answers = Array(surveyQuestions.length).fill('');
  let currentQuestion = 0;
  let complete = false;

  const renderQuestion = () => {
    const question = surveyQuestions[currentQuestion];
    title.innerHTML = question.title;
    progressLabel.textContent = `${currentQuestion + 1} / ${surveyQuestions.length}`;
    progressBar.style.width = `${((currentQuestion + 1) / surveyQuestions.length) * 100}%`;
    matchCard.querySelector('.progress').setAttribute('aria-valuenow', String(currentQuestion + 1));
    choiceGrid.hidden = false;
    choiceGrid.replaceChildren(...question.choices.map(choice => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice;
      button.classList.toggle('selected', answers[currentQuestion] === choice);
      button.setAttribute('aria-pressed', String(answers[currentQuestion] === choice));
      return button;
    }));
    nextButton.innerHTML = currentQuestion === surveyQuestions.length - 1
      ? 'Finish <span>✓</span>'
      : 'Continue <span>→</span>';
  };

  const renderSurveyResults = async () => {
    const results = document.createElement('div');
    results.className = 'survey-results';
    results.setAttribute('aria-live', 'polite');
    results.textContent = 'Finding opportunities that fit your answers…';
    choiceGrid.after(results);

    try {
      const opportunities = await getHomepageOpportunities();
      const weights = [1, 2, 1, 1];
      const preferences = answers
        .map((answer, index) => ({ answer, weight: weights[index] }))
        .filter(({ answer }) => answer && !['Either is fine', 'No preference', 'It depends'].includes(answer));
      const ranked = opportunities
        .map(item => {
          const tags = item.tags || [];
          const score = preferences.reduce(
            (total, preference) => total + (tags.includes(preference.answer) ? preference.weight : 0),
            0
          );
          return { item, score };
        })
        .filter(result => preferences.every(({ answer }) => result.item.tags?.includes(answer))
          && !result.item.tags?.includes('18+'))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      results.replaceChildren();
      if (!ranked.length) {
        const message = document.createElement('p');
        message.className = 'survey-result';
        message.textContent = 'We don’t have a listing tagged for every selected preference yet. Browse all opportunities and confirm schedule and eligibility with each organization.';
        results.append(message);
      } else {
        const intro = document.createElement('p');
        intro.className = 'survey-result';
        intro.textContent = preferences.length
          ? 'These listings match all of your specific selections. Confirm dates and details with each organization.'
          : 'Here are a few current local listings to explore.';
        results.append(intro);

        ranked.forEach(({ item }) => {
          const card = document.createElement('article');
          card.className = 'survey-result-item';

          const heading = document.createElement('h4');
          heading.textContent = item.title;
          card.append(heading);

          const organization = document.createElement('p');
          organization.className = 'survey-result-org';
          organization.textContent = item.org;
          card.append(organization);

          const description = document.createElement('p');
          description.textContent = item.description || 'See the organization’s listing for opportunity details.';
          card.append(description);

          const age = document.createElement('p');
          age.textContent = `Age: ${item.ageRequirement || 'Confirm age eligibility with the organization.'}`;
          card.append(age);

          const requirements = document.createElement('p');
          requirements.textContent = `Guidelines: ${item.requirements || 'Check the organization’s listing for current details.'}`;
          card.append(requirements);

          if (item.applicationSteps?.length) {
            const steps = document.createElement('ol');
            steps.className = 'survey-result-steps';
            item.applicationSteps.forEach(step => {
              const entry = document.createElement('li');
              entry.textContent = step;
              steps.append(entry);
            });
            card.append(steps);
          }

          if (item.contactEmail) {
            const contact = document.createElement('p');
            contact.className = 'survey-result-contact';
            contact.append('Contact: ');
            const email = document.createElement('a');
            email.href = `mailto:${item.contactEmail.replace(/[\r\n]/g, '')}`;
            email.textContent = item.contactEmail;
            contact.append(email);
            card.append(contact);
          }

          const link = document.createElement('a');
          const applyUrl = safeExternalUrl(item.applyUrl);
          link.href = applyUrl || 'search.html';
          link.textContent = item.applyMode === 'events' ? 'View current events →' : 'View opportunity →';
          if (applyUrl) {
            link.target = '_blank';
            link.rel = 'noopener';
          }
          card.append(link);
          results.append(card);
        });
      }

      const allLink = document.createElement('a');
      allLink.className = 'survey-all';
      allLink.href = 'search.html';
      allLink.textContent = 'Browse all opportunities →';
      results.append(allLink);
    } catch {
      results.replaceChildren();
      const message = document.createElement('p');
      message.className = 'survey-result';
      message.textContent = 'We couldn’t load recommendations right now. Browse all current opportunities instead.';
      results.append(message);
      const allLink = document.createElement('a');
      allLink.className = 'survey-all';
      allLink.href = 'search.html';
      allLink.textContent = 'Browse all opportunities →';
      results.append(allLink);
    }
  };

  choiceGrid.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !choiceGrid.contains(button)) return;
    answers[currentQuestion] = button.textContent;
    choiceGrid.querySelectorAll('button').forEach(choice => {
      const selected = choice === button;
      choice.classList.toggle('selected', selected);
      choice.setAttribute('aria-pressed', String(selected));
    });
  });

  nextButton.addEventListener('click', () => {
    if (complete) {
      matchCard.querySelector('.survey-result')?.remove();
      matchCard.querySelector('.survey-browse')?.remove();
      matchCard.querySelector('.survey-results')?.remove();
      answers.fill('');
      currentQuestion = 0;
      complete = false;
      renderQuestion();
      return;
    }

    if (currentQuestion < surveyQuestions.length - 1) {
      currentQuestion += 1;
      renderQuestion();
      return;
    }

    complete = true;
    progressLabel.textContent = `${surveyQuestions.length} / ${surveyQuestions.length}`;
    progressBar.style.width = '100%';
    matchCard.querySelector('.progress').setAttribute('aria-valuenow', String(surveyQuestions.length));
    title.textContent = 'You’re ready to explore.';
    choiceGrid.hidden = true;
    renderSurveyResults();
    nextButton.innerHTML = 'Start over <span>↻</span>';
  });

  renderQuestion();
}

function visual(item) {
  return `<span aria-hidden="true">${escapeHtml(item.graphic || '✦')}</span>`;
}

async function loadWeekendOpportunities() {
  const grid = document.querySelector('#weekend-grid');
  if (!grid) return;

  try {
    const opportunities = await getHomepageOpportunities();
    const weekend = opportunities.filter(item =>
      (item.tags || []).some(tag => /weekend/i.test(tag)) || /saturday|sunday|weekend/i.test(item.hours || '')
    );
    const cards = (weekend.length ? weekend : opportunities).slice(0, 3);

    if (!cards.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;color:var(--muted)">No weekend opportunities yet. Check back soon.</p>';
      return;
    }

    grid.innerHTML = cards.map((item, index) => {
      const category = (item.tags || []).find(tag =>
        ['Animals', 'Food access', 'Youth', 'Environment', 'Arts', 'Housing', 'Seniors'].includes(tag)
      ) || item.city;
      const href = safeExternalUrl(item.applyUrl) || 'search.html';
      const external = href !== 'search.html';
      const color = ['animals', 'food', 'youth', 'environment', 'arts'].includes(item.color) ? item.color : '';
      return `
        <article class="opp ${color} ${['one', 'two', 'three'][index] || ''}">
          <span class="category">${escapeHtml(category.toUpperCase())}</span>
          <div class="opp-visual">${visual(item)}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.city)}${item.area ? ` · ${escapeHtml(item.area)}` : ''} · ${escapeHtml(item.hours)}</p>
          <a href="${escapeHtml(href)}" ${external ? 'target="_blank" rel="noopener"' : ''}>Apply <b>↗</b></a>
        </article>
      `;
    }).join('');
  } catch {
    grid.innerHTML = '<p style="grid-column:1/-1;color:var(--muted)">Couldn’t load opportunities right now.</p>';
  }
}

loadWeekendOpportunities();
