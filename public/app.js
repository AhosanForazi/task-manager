/* ───────────────────────────────────────────────────────────────
   Task Manager — frontend app
   Talks to the same Express server via /api/tasks.
   ─────────────────────────────────────────────────────────────── */

(() => {
  'use strict';

  const API = '/api/tasks';

  // ───── State ─────
  const state = {
    tasks: [],
    filter: 'all',      // 'all' | 'pending' | 'in_progress' | 'done'
    search: '',
    editingId: null,
  };

  // ───── Tiny helpers ─────
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const STATUS_LABEL = {
    pending: 'Pending',
    in_progress: 'In progress',
    done: 'Done',
  };
  const STATUS_CLASS = {
    pending: 'status-pending',
    in_progress: 'status-progress',
    done: 'status-done',
  };
  const STATUS_ORDER = { in_progress: 0, pending: 1, done: 2 };

  function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return '—';
    const diffMs = Date.now() - d.getTime();
    const sec = Math.round(diffMs / 1000);
    if (sec < 45) return 'just now';
    if (sec < 90) return '1 min ago';
    const min = Math.round(sec / 60);
    if (min < 45) return `${min} min ago`;
    if (min < 90) return '1 hour ago';
    const hr = Math.round(min / 60);
    if (hr < 22) return `${hr} hours ago`;
    if (hr < 36) return '1 day ago';
    const day = Math.round(hr / 24);
    if (day < 26) return `${day} days ago`;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ───── Toast ─────
  function toast(message, kind = 'info', { timeout = 3200 } = {}) {
    const stack = $('#toast-stack');
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    const iconChar = kind === 'success' ? '✓' : kind === 'error' ? '!' : 'i';
    el.innerHTML = `
      <span class="toast-icon">${iconChar}</span>
      <div class="toast-body">${escapeHTML(message)}</div>
    `;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, timeout);
  }

  // ───── API client ─────
  async function apiList() {
    const res = await fetch(API);
    if (!res.ok) throw new Error(`List failed: ${res.status}`);
    const json = await res.json();
    return json.data || [];
  }

  async function apiCreate(payload) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new ApiError(json);
    return json.data;
  }

  async function apiUpdate(id, payload) {
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new ApiError(json);
    return json.data;
  }

  async function apiDelete(id) {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      let json = null;
      try { json = await res.json(); } catch (_) { /* no body */ }
      throw new ApiError(json || { error: 'DeleteFailed' });
    }
    return true;
  }

  class ApiError extends Error {
    constructor(payload) {
      super(payload?.error || 'Request failed');
      this.payload = payload || {};
      this.details = this.payload.details || [];
    }
  }

  // ───── Render ─────
  function filteredSorted() {
    const q = state.search.trim().toLowerCase();
    return state.tasks
      .filter((t) => {
        if (state.filter !== 'all' && t.status !== state.filter) return false;
        if (!q) return true;
        return (
          (t.title || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        );
      })
      // Always sort by newest first.
      .sort((a, b) => {
        const aTs = new Date((a.created_at || '').replace(' ', 'T') + 'Z').getTime() || 0;
        const bTs = new Date((b.created_at || '').replace(' ', 'T') + 'Z').getTime() || 0;
        return bTs - aTs;
      });
  }

  function snapshotStats() {
    const total    = state.tasks.length;
    const pending  = state.tasks.filter((t) => t.status === 'pending').length;
    const progress = state.tasks.filter((t) => t.status === 'in_progress').length;
    const done     = state.tasks.filter((t) => t.status === 'done').length;
    return { total, pending, progress, done };
  }

  function renderStats(prev) {
    const s = snapshotStats();
    setCount($('#stat-total'),    s.total,    prev?.total);
    setCount($('#stat-pending'),  s.pending,  prev?.pending);
    setCount($('#stat-progress'), s.progress, prev?.progress);
    setCount($('#stat-done'),     s.done,     prev?.done);
  }

  function setCount(node, value, prevValue) {
    if (!node) return;
    if (prevValue !== undefined && prevValue !== value) {
      node.classList.remove('is-bump');
      void node.offsetWidth;
      node.classList.add('is-bump');
    }
    animateNumber(node, prevValue ?? 0, value, 380);
  }

  function animateNumber(node, from, to, duration) {
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (to - from) * ease(t));
      node.textContent = v;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function render() {
    const grid = $('#task-grid');
    const tasks = filteredSorted();
    grid.innerHTML = tasks.map((t, i) => taskCardHTML(t, i)).join('');
  }

  function taskCardHTML(t, i) {
    const status = t.status || 'pending';
    const descHTML = t.description
      ? `<p class="task-desc">${escapeHTML(t.description)}</p>`
      : '';
    const delay = Math.min(i * 40, 320);
    return `
      <article class="task-card ${status === 'done' ? 'is-done' : ''} status-${status === 'in_progress' ? 'progress' : status}" data-id="${t.id}" style="--delay: ${delay}ms">
        <div class="task-card-top">
          <h3 class="task-title">${escapeHTML(t.title)}</h3>
          <span class="status-pill ${STATUS_CLASS[status]}">
            <span class="dot dot-${status === 'in_progress' ? 'progress' : status}"></span>
            ${STATUS_LABEL[status]}
          </span>
        </div>
        ${descHTML}
        <div class="task-meta">
          <span class="updated-by">⏱ ${escapeHTML(formatDate(t.updated_at || t.created_at))}</span>
          <div class="task-actions">
            <button class="icon-action" data-action="edit" data-id="${t.id}" aria-label="Edit" title="Edit">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>
            <button class="icon-action icon-danger" data-action="delete" data-id="${t.id}" aria-label="Delete" title="Delete">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // ───── Load ─────
  async function load() {
    try {
      state.tasks = await apiList();
      renderStats();
      render();
    } catch (err) {
      console.error(err);
      toast('Could not load tasks. Is the API running?', 'error');
    }
  }

  // ───── Modal ─────
  function openModal({ id = null } = {}) {
    state.editingId = id;
    const task = id ? state.tasks.find((t) => t.id === id) : null;

    $('#modal-eyebrow').textContent = task ? `Editing · #${task.id}` : 'New entry';
    $('#modal-title').textContent = task ? 'Edit task' : 'New task';
    $('#modal-submit').textContent = task ? 'Save changes' : 'Create task';

    $('#f-id').value = task?.id ?? '';
    $('#f-title').value = task?.title ?? '';
    $('#f-description').value = task?.description ?? '';
    updateCharCount();
    const status = task?.status ?? 'pending';
    const radio = $(`#s-${status === 'in_progress' ? 'progress' : status}`);
    if (radio) radio.checked = true;

    clearFieldErrors();
    $('#task-modal').hidden = false;
    setTimeout(() => $('#f-title').focus(), 30);
  }

  function closeModal() {
    $('#task-modal').hidden = true;
    state.editingId = null;
  }

  function clearFieldErrors() {
    $$('[data-error-for]').forEach((el) => (el.textContent = ''));
  }

  function showFieldErrors(payload) {
    clearFieldErrors();
    const details = payload?.details || [];
    if (!details.length) {
      toast(payload?.message || payload?.error || 'Something went wrong', 'error');
      return;
    }
    details.forEach((msg) => {
      const lower = msg.toLowerCase();
      if (lower.includes('title'))       $('[data-error-for="title"]').textContent = msg;
      else if (lower.includes('description')) $('[data-error-for="description"]').textContent = msg;
      else if (lower.includes('status'))  $('[data-error-for="status"]').textContent = msg;
      else toast(msg, 'error');
    });
  }

  function updateCharCount() {
    const v = $('#f-description').value.length;
    const node = $('#char-count');
    if (node) node.textContent = v;
  }

  async function submitTask(ev) {
    ev.preventDefault();
    const payload = {
      title: $('#f-title').value.trim(),
      description: $('#f-description').value.trim() || null,
      status: $('input[name="status"]:checked')?.value || 'pending',
    };

    const submitBtn = $('#modal-submit');
    submitBtn.disabled = true;
    const prevLabel = submitBtn.textContent;
    submitBtn.textContent = state.editingId ? 'Saving…' : 'Creating…';

    try {
      const prevStats = snapshotStats();
      if (state.editingId) {
        const updated = await apiUpdate(state.editingId, payload);
        const idx = state.tasks.findIndex((t) => t.id === updated.id);
        if (idx >= 0) state.tasks[idx] = updated;
        toast('Task updated', 'success');
      } else {
        const created = await apiCreate(payload);
        state.tasks.unshift(created);
        toast('Task created', 'success');
      }
      renderStats(prevStats);
      render();
      closeModal();
    } catch (err) {
      if (err instanceof ApiError) showFieldErrors(err.payload);
      else toast(err.message || 'Request failed', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = prevLabel;
    }
  }

  // ───── Confirm modal ─────
  function confirmDelete(task) {
    return new Promise((resolve) => {
      $('#confirm-target').textContent = task.title;
      const modal = $('#confirm-modal');
      modal.hidden = false;
      const ok = $('#confirm-ok');
      const cleanup = () => {
        modal.hidden = true;
        ok.removeEventListener('click', onOk);
        $$('#confirm-modal [data-close]').forEach((b) => b.removeEventListener('click', onCancel));
        document.removeEventListener('keydown', onKey);
      };
      const onOk    = () => { cleanup(); resolve(true);  };
      const onCancel = () => { cleanup(); resolve(false); };
      const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
      ok.addEventListener('click', onOk);
      $$('#confirm-modal [data-close]').forEach((b) => b.addEventListener('click', onCancel));
      document.addEventListener('keydown', onKey);
    });
  }

  // ───── Theme ─────
  function initTheme() {
    const saved = localStorage.getItem('tm-theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }
    $('#theme-toggle').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme')
        || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('tm-theme', next);
    });
  }

  // ───── Wire up ─────
  function syncPillActive() {
    $$('.pill').forEach((el) => {
      const key = el.dataset.stat;
      const matches = (key === 'all' && state.filter === 'all') || key === state.filter;
      el.classList.toggle('is-active', matches);
      el.setAttribute('aria-selected', matches ? 'true' : 'false');
    });
  }

  function init() {
    initTheme();

    // New task (button + N hotkey)
    $('#btn-new-task').addEventListener('click', () => openModal());
    document.addEventListener('keydown', (e) => {
      const target = e.target;
      const inField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (inField) return;
      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openModal();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        $('#search').focus();
      }
    });

    // Modal close
    $$('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#task-modal').hidden) closeModal();
    });

    // Submit + char count
    $('#task-form').addEventListener('submit', submitTask);
    $('#f-description').addEventListener('input', updateCharCount);

    // Filter pills
    $$('.pill').forEach((el) => {
      el.addEventListener('click', () => {
        state.filter = el.dataset.stat || 'all';
        syncPillActive();
        render();
      });
    });

    // Search
    let searchTimer = null;
    $('#search').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const value = e.target.value;
      searchTimer = setTimeout(() => {
        state.search = value;
        render();
      }, 120);
    });

    // Card actions
    $('#task-grid').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return;

      if (btn.dataset.action === 'edit') {
        openModal({ id });
      } else if (btn.dataset.action === 'delete') {
        const ok = await confirmDelete(task);
        if (!ok) return;
        try {
          const prevStats = snapshotStats();
          await apiDelete(id);
          state.tasks = state.tasks.filter((t) => t.id !== id);
          renderStats(prevStats);
          render();
          toast('Task deleted', 'success');
        } catch (err) {
          toast(err.message || 'Delete failed', 'error');
        }
      }
    });

    syncPillActive();
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
