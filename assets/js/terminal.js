/*
 * terminal.js: the in-page shell on the home page.
 *
 * Every answer is read from this page's own HTML when the command runs, so the
 * terminal can never disagree with the page, and a visitor without JavaScript
 * misses nothing. Output is built from DOM nodes and textContent only (no
 * innerHTML), which keeps it safe under the site's Content Security Policy.
 */
(() => {
  'use strict';

  const log = document.getElementById('term-log');
  const form = document.getElementById('term-form');
  const input = document.getElementById('term-input');
  if (!log || !form || !input) return;

  const PS1 = 'guest@mp:~$';
  const history = [];
  let historyIndex = 0;

  /* ---- Reading the page ---------------------------------------------- */

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  /* ---- Writing output ------------------------------------------------ */

  // Append one line. `parts` is a string, a node, or an array mixing both.
  // `kind` is one or more space-separated styles: out, head, muted, err, indent.
  function print(parts, kind = 'out') {
    const line = document.createElement('p');
    line.className = kind.split(' ').map((k) => 't-' + k).join(' ');
    line.append(...[].concat(parts));
    log.append(line);
  }

  function link(href, label) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    return a;
  }

  function span(content, className) {
    const s = document.createElement('span');
    s.className = className;
    s.textContent = content;
    return s;
  }

  const column = (value, width = 10) => value.padEnd(width);

  /* ---- Commands ------------------------------------------------------ */

  const commands = {
    help: {
      summary: 'list commands',
      run() {
        Object.entries(commands)
          .filter(([, cmd]) => !cmd.hidden)
          .forEach(([name, cmd]) => print(column(name) + cmd.summary));
        print('Tab completes a command. Up and down arrows recall history.', 'muted');
      },
    },

    whoami: {
      summary: 'who runs this site',
      run() {
        print(text($('#hero-name')), 'head');
        print($$('.tagline span').map(text).join(' | '));
        $$('#about .about-text p').forEach((p) => print(text(p)));
      },
    },

    skills: {
      summary: 'tech stack, grouped by domain',
      run() {
        $$('#stack .stack-group').forEach((group) => {
          print(text($('h3', group)), 'head');
          print($$('li', group).map(text).join(', '), 'out indent');
        });
      },
    },

    projects: {
      summary: 'featured case studies',
      run() {
        $$('#work .card').forEach((card) => {
          const title = $('h3 a', card);
          print(text(title), 'head');
          print(text($('.card-summary', card)), 'out indent');
          print(link(title.getAttribute('href'), 'read the case study'), 'out indent');
        });
      },
    },

    repos: {
      summary: 'open-source tools',
      run() {
        $$('#src .repo').forEach((repo) => {
          const title = $('h3 a', repo);
          print([link(title.getAttribute('href'), text(title)), '  (' + text($('.repo-lang', repo)) + ')']);
          print(text($('.repo-desc', repo)), 'out indent');
        });
      },
    },

    certs: {
      summary: 'certifications',
      run() {
        $$('#certs li').forEach((li) => print(text(li), 'out indent'));
      },
    },

    contact: {
      summary: 'how to reach me',
      run() {
        $$('#contact .contact-list > div').forEach((row) => {
          const a = $('a', row);
          print([column(text($('dt', row))), link(a.getAttribute('href'), text(a))]);
        });
      },
    },

    ls: {
      summary: 'list page sections',
      run() {
        const sections = $$('main section[id]').map((s) => link('#' + s.id, s.id + '/'));
        print(sections.flatMap((a, i) => (i ? ['  ', a] : [a])));
      },
    },

    clear: {
      summary: 'clear the screen',
      run() {
        log.replaceChildren();
      },
    },

    sudo: {
      hidden: true,
      run() {
        print('guest is not in the sudoers file. This incident will be reported.', 'err');
      },
    },
  };

  const visibleNames = Object.keys(commands).filter((name) => !commands[name].hidden);

  function run(raw) {
    const line = raw.trim();
    print([span(PS1, 't-ps1'), ' ' + line], 'echo');

    if (line) {
      history.push(line);
      const name = line.split(/\s+/)[0];
      const cmd = commands[name.toLowerCase()];
      if (cmd) {
        cmd.run();
      } else {
        print(name + ": command not found. Type 'help' for a list.", 'err');
      }
    }

    historyIndex = history.length;
    log.scrollTop = log.scrollHeight;
  }

  /* ---- Input --------------------------------------------------------- */

  function setInput(value) {
    input.value = value;
    input.setSelectionRange(value.length, value.length);
  }

  // Complete to the longest unambiguous prefix. Returns true if the input
  // changed; otherwise Tab keeps its normal job of moving focus, so the
  // terminal never traps keyboard users.
  function complete() {
    const value = input.value;
    if (!value || /\s/.test(value)) return false;

    const matches = visibleNames.filter((name) => name.startsWith(value.toLowerCase()));
    if (!matches.length) return false;

    let prefix = matches[0];
    for (const name of matches) {
      while (!name.startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    const completed = matches.length === 1 ? prefix + ' ' : prefix;
    if (completed === value) return false;

    setInput(completed);
    return true;
  }

  input.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (historyIndex > 0) setInput(history[--historyIndex]);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (historyIndex < history.length) {
          historyIndex += 1;
          setInput(history[historyIndex] || '');
        }
        break;
      case 'Tab':
        if (!event.shiftKey && complete()) event.preventDefault();
        break;
      case 'Escape':
        setInput('');
        break;
      case 'l':
        if (event.ctrlKey) {
          event.preventDefault();
          log.replaceChildren();
        }
        break;
      default:
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run(input.value);
    setInput('');
  });

  // With a mouse, clicking the output focuses the prompt (unless text is being
  // selected). Skipped on touch screens so reading doesn't pop the keyboard.
  if (window.matchMedia('(pointer: fine)').matches) {
    log.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      if (window.getSelection().isCollapsed) input.focus({ preventScroll: true });
    });
  }

  $$('.chip[data-cmd]').forEach((chip) => {
    chip.disabled = false;
    chip.addEventListener('click', () => run(chip.dataset.cmd));
  });

  /* ---- Boot ---------------------------------------------------------- */

  // Open with the command list already on screen. Live announcements are
  // paused while it prints so screen readers don't read it out on page load.
  input.disabled = false;
  input.placeholder = "type 'help'";
  log.setAttribute('aria-live', 'off');
  log.replaceChildren();
  run('help');
  history.length = 0;
  historyIndex = 0;
  window.setTimeout(() => log.removeAttribute('aria-live'), 1000);
})();
