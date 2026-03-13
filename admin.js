/* ============================================
   英検合格体験記 管理ページ — JavaScript
   (Google Apps Script 版)
   ============================================ */

// ★★★ デプロイした Google Apps Script の URL をここに貼り付け ★★★
const API_URL = 'https://script.google.com/macros/s/AKfycbyISzloCXGxG1A-Pobs-JDVNXWd7isteOMLdU60z9XjvcSZAvIt_-8aICkcJh6vNPD0/exec';

let allStories = [];
let currentFilter = 'all';
let currentYear = 'all';

const UPPER_GRADES = ['1級', '準1級', '2級', '準2級'];

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initFilters();
  initDeleteConfirm();
  loadStories();
});

/* --- パーティクル生成 --- */
function initParticles() {
  const container = document.getElementById('sakuraContainer');
  const count = 18;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'petal';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (8 + Math.random() * 10) + 's';
    p.style.animationDelay = Math.random() * 12 + 's';
    p.style.opacity = 0.2 + Math.random() * 0.3;
    container.appendChild(p);
  }
}

/* --- GAS からデータ読み込み --- */
async function loadStories() {
  const grid = document.getElementById('storiesGrid');
  grid.innerHTML = '<div style="text-align:center; padding:40px; color: var(--text-muted);">📡 データを読み込んでいます...</div>';

  try {
    const response = await fetch(API_URL + '?action=getAll');
    const result = await response.json();
    allStories = result.stories || [];
    renderStories();
  } catch (error) {
    grid.innerHTML = '<div style="text-align:center; padding:40px; color: #dc3545;">⚠️ データの読み込みに失敗しました。<br><small>' + error.message + '</small></div>';
    console.error(error);
  }
}

/* --- フィルター --- */
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderStories();
    });
  });

  document.getElementById('yearFilter').addEventListener('change', (e) => {
    currentYear = e.target.value;
    renderStories();
  });
}

/* --- 統計更新 --- */
function updateStats(stories) {
  const total = stories.length;
  const upper = stories.filter(s => UPPER_GRADES.includes(s.grade)).length;
  const lower = total - upper;
  const avg = total > 0
    ? (stories.reduce((sum, s) => sum + (Number(s.rating) || 0), 0) / total).toFixed(1)
    : '-';

  document.getElementById('totalCount').textContent = total;
  document.getElementById('upperCount').textContent = upper;
  document.getElementById('lowerCount').textContent = lower;
  document.getElementById('avgRating').textContent = avg === '-' ? '-' : '★ ' + avg;
}

/* --- カード描画 --- */
function renderStories() {
  updateStats(allStories);

  let filtered = allStories;
  if (currentFilter !== 'all') {
    filtered = filtered.filter(s => s.grade === currentFilter);
  }
  if (currentYear !== 'all') {
    filtered = filtered.filter(s => String(s.year) === currentYear);
  }

  const grid = document.getElementById('storiesGrid');
  const empty = document.getElementById('emptyState');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = filtered.map((story, idx) => createStoryCard(story, idx)).join('');
}

function createStoryCard(story, idx) {
  const delay = Math.min(idx * 0.08, 0.6);
  const rating = Number(story.rating) || 0;
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const schoolInfo = story.school && story.schoolYear ? story.school + ' ' + story.schoolYear : (story.school || '');

  const parentSection = story.parentMessage
    ? `<div class="story-card__parent">
        <div class="story-card__parent-label">👨‍👩‍👧 保護者からのメッセージ</div>
        <div class="story-card__parent-text">${escapeHtml(story.parentMessage)}</div>
      </div>`
    : '';

  return `
    <article class="story-card fade-in" style="animation-delay: ${delay}s;" data-id="${story.id}">
      <button class="story-card__delete" onclick="requestDelete('${story.id}')" title="削除">🗑</button>
      <div class="story-card__header">
        <div class="story-card__avatar">${escapeHtml(story.initials)}</div>
        <div class="story-card__meta">
          <div class="story-card__school">英検 ${escapeHtml(story.grade)} 合格</div>
          <div class="story-card__tags">
            <span class="story-card__tag story-card__tag--grade">🏅 ${escapeHtml(story.grade)}</span>
            <span class="story-card__tag story-card__tag--year">${story.year}年 ${escapeHtml(story.session || '')}</span>
            ${schoolInfo ? `<span class="story-card__tag story-card__tag--school-info">🏫 ${escapeHtml(schoolInfo)}</span>` : ''}
          </div>
          <div class="story-card__stars">${stars}</div>
        </div>
      </div>

      <div class="story-card__section">
        <div class="story-card__section-title">😣 英検の勉強で苦労したこと</div>
        <div class="story-card__section-text">${escapeHtml(story.struggle)}</div>
      </div>

      <div class="story-card__section">
        <div class="story-card__section-title">🌱 できるようになったこと</div>
        <div class="story-card__section-text">${escapeHtml(story.growth)}</div>
      </div>

      <div class="story-card__section">
        <div class="story-card__section-title">💌 講師／教室へ一言</div>
        <div class="story-card__section-text">${escapeHtml(story.message)}</div>
      </div>

      ${story.summary ? `
      <div class="story-card__section">
        <div class="story-card__section-title">🌟 まとめの感想</div>
        <div class="story-card__section-text">${escapeHtml(story.summary)}</div>
      </div>` : ''}

      ${parentSection}
    </article>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* --- 削除機能 --- */
let deleteTargetId = null;

function requestDelete(id) {
  deleteTargetId = id;
  document.getElementById('confirmOverlay').classList.add('active');
}

function initDeleteConfirm() {
  const overlay = document.getElementById('confirmOverlay');
  document.getElementById('confirmCancel').addEventListener('click', () => {
    overlay.classList.remove('active');
    deleteTargetId = null;
  });
  document.getElementById('confirmOk').addEventListener('click', async () => {
    if (deleteTargetId) {
      try {
        const res = await fetch(API_URL + '?action=delete&id=' + encodeURIComponent(deleteTargetId));
        const result = await res.json();
        if (result.success) {
          allStories = allStories.filter(s => s.id !== deleteTargetId);
          renderStories();
        } else {
          alert('削除に失敗しました。');
        }
      } catch (error) {
        alert('削除に失敗しました。');
        console.error(error);
      }
    }
    overlay.classList.remove('active');
    deleteTargetId = null;
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      deleteTargetId = null;
    }
  });
}
