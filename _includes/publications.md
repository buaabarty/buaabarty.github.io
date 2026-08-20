<h2 id="publications">Publications</h2>

<div class="publications">
<ol class="bibliography">
{% for link in site.data.publications.main %}
<li class="pub-entry">
  <div class="pub-title">{% if link.pdf %}<a href="{{ link.pdf }}" target="_blank" rel="noopener">{{ link.title }}</a>{% else %}{{ link.title }}{% endif %}</div>
  <div class="pub-authors">{{ link.authors }}</div>
  <div class="pub-venue">{% if link.conference_short %}<span class="pub-badge">{{ link.conference_short }}</span>{% endif %}{% if link.ccf %}<span class="pub-badge ccf ccf-{{ link.ccf | slice: -1 | downcase }}">{{ link.ccf }}</span>{% endif %}<em>{{ link.conference }}</em></div>
  {% if link.pdf or link.code or link.page or link.bibtex or link.notes %}
  <div class="pub-links">
    {% if link.pdf %}<a href="{{ link.pdf }}" target="_blank" rel="noopener">PDF</a>{% endif %}
    {% if link.code %}<a href="{{ link.code }}" target="_blank" rel="noopener">Code</a>{% endif %}
    {% if link.page %}<a href="{{ link.page }}" target="_blank" rel="noopener">Project</a>{% endif %}
    {% if link.bibtex %}<a href="{{ link.bibtex }}" target="_blank" rel="noopener">BibTeX</a>{% endif %}
    {% if link.notes %}<span class="pub-note">{{ link.notes }}</span>{% endif %}
  </div>
  {% endif %}
</li>
{% endfor %}
</ol>
</div>
