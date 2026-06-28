"use strict";

// ==================== DOM 元素引用 ====================
const els = {
  canvas: document.getElementById("stage"),
  nameOverlay: document.getElementById("nameOverlay"),
  midiFile: document.getElementById("midiFile"),
  trackCount: document.getElementById("trackCount"),
  totalTracks: document.getElementById("totalTracks"),
  trackSort: document.getElementById("trackSort"),
  tracks: document.getElementById("tracks"),
  status: document.getElementById("status"),
  playBtn: document.getElementById("playBtn"),
  stopBtn: document.getElementById("stopBtn"),
  renderBtn: document.getElementById("renderBtn"),
  layoutBtn: document.getElementById("layoutBtn"),
  seek: document.getElementById("seek"),
  timeText: document.getElementById("timeText"),
  videoWidth: document.getElementById("videoWidth"),
  videoHeight: document.getElementById("videoHeight"),
  fps: document.getElementById("fps"),
  volume: document.getElementById("volume"),
  backgroundFile: document.getElementById("backgroundFile"),
  transparentExport: document.getElementById("transparentExport"),
  defaultClosedImage: document.getElementById("defaultClosedImage"),
  defaultOpenImage: document.getElementById("defaultOpenImage"),
  defaultClosedSwatch: document.getElementById("defaultClosedSwatch"),
  defaultOpenSwatch: document.getElementById("defaultOpenSwatch"),
  lyricColor: document.getElementById("lyricColor"),
  lyricMode: document.getElementById("lyricMode"),
  lyricFont: document.getElementById("lyricFont"),
  lyricSize: document.getElementById("lyricSize"),
  lyricSizeValue: document.getElementById("lyricSizeValue"),
  lyricX: document.getElementById("lyricX"),
  lyricXValue: document.getElementById("lyricXValue"),
  lyricHeight: document.getElementById("lyricHeight"),
  lyricHeightValue: document.getElementById("lyricHeightValue"),
  downloadLink: document.getElementById("downloadLink"),
  resetBtn: document.getElementById("resetBtn"),
  exportFormat: document.getElementById("exportFormat"),
  trackSelectorSection: document.getElementById("trackSelectorSection"),
  trackSelector: document.getElementById("trackSelector"),
  deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
  guideLineCount: document.getElementById("guideLineCount"),
  guideLineCountValue: document.getElementById("guideLineCountValue"),
  guideLineSpacing: document.getElementById("guideLineSpacing"),
  guideLineSpacingValue: document.getElementById("guideLineSpacingValue"),
};

const ctx = els.canvas.getContext("2d");

// ==================== 全局状态变量 ====================
let song = null;           // 解析后的 MIDI 数据
let configs = [];          // 每个轨道的配置（位置、缩放、图片等）
let allTracks = [];        // MIDI 文件中的所有轨道（包括没有音符的）
let playing = false;       // 是否正在播放预览
let playStartedAt = 0;     // 播放开始时间
let playOffset = 0;        // 播放偏移量（用于暂停后继续）
let rafId = 0;             // requestAnimationFrame ID
let audioContext = null;    // Web Audio API 上下文
let activeOscillators = []; // 当前活跃的音频振荡器
let backgroundImage = null;       // 背景图片对象
let backgroundImageDataUrl = null; // 背景图片 DataURL
let defaultClosedImage = null;     // 默认闭嘴图片
let defaultClosedImageDataUrl = null;
let defaultOpenImage = null;       // 默认张嘴图片
let defaultOpenImageDataUrl = null;
let draggedTrackIndex = -1; // 当前拖拽的轨道索引
let restoring = false;      // 是否正在恢复状态（防止循环保存）

// ==================== 常量配置 ====================
const CHARACTER_SIZE_RATIO = 0.3;  // 角色大小占画布短边的比例
const LYRIC_FLOAT_DURATION = 0.7;  // 歌词上浮动画时长（秒）
const LYRIC_HOLD_DURATION = 0;     // 歌词停留时长（秒）
const LYRIC_FADE_DURATION = 0.3;   // 歌词淡出时长（秒）
const LYRIC_TOTAL_DURATION = LYRIC_FLOAT_DURATION + LYRIC_HOLD_DURATION + LYRIC_FADE_DURATION;
const STORE_NAME = "midi-character-video-state-v1"; // localStorage 存储键名
const FILE_KEYS = ["midi", "background", "defaultClosed", "defaultOpen"];

// 乐器分类定义
const TRACK_CATEGORIES = {
  VOCAL: { name: "主唱", icon: "🎤", color: "#e91e63" },
  HARMONY: { name: "和声", icon: "🎵", color: "#9c27b0" },
  BASS: { name: "贝斯", icon: "🎸", color: "#2196f3" },
  DRUMS: { name: "鼓组", icon: "🥁", color: "#ff9800" },
  MELODY: { name: "旋律", icon: "🎹", color: "#4caf50" },
  CHORDS: { name: "和弦", icon: "🎶", color: "#00bcd4" },
  OTHER: { name: "其他", icon: "🎼", color: "#607d8b" },
};

// 默认角色颜色（当没有自定义图片时使用）
const DEFAULT_COLORS = [
  "#49c5b6",  // 青色
  "#f0c15f",  // 黄色
  "#ef7d57",  // 橙色
  "#8ab4f8",  // 蓝色
  "#c58af9",  // 紫色
  "#7ad77a",  // 绿色
  "#f285ad",  // 粉色
  "#6fd0ff",  // 浅蓝
];

// ==================== 事件监听器绑定 ====================
els.midiFile.addEventListener("change", loadMidi);
els.playBtn.addEventListener("click", playPreview);
els.stopBtn.addEventListener("click", stopPreview);
els.renderBtn.addEventListener("click", renderVideo);
els.layoutBtn.addEventListener("click", autoLayout);
els.backgroundFile.addEventListener("change", loadBackground);
els.defaultClosedImage.addEventListener("change", (event) => loadDefaultImage(event, "closedImage"));
els.defaultOpenImage.addEventListener("change", (event) => loadDefaultImage(event, "openImage"));
els.lyricColor.addEventListener("input", () => drawFrame(currentTime()));
els.lyricFont.addEventListener("change", () => drawFrame(currentTime()));
els.lyricSize.addEventListener("input", () => {
  els.lyricSizeValue.textContent = `${els.lyricSize.value}%`;
  drawFrame(currentTime());
});
els.lyricX.addEventListener("input", () => {
  els.lyricXValue.textContent = els.lyricX.value;
  drawFrame(currentTime());
});
els.lyricHeight.addEventListener("input", () => {
  els.lyricHeightValue.textContent = els.lyricHeight.value;
  drawFrame(currentTime());
});
els.trackCount.addEventListener("change", reloadMidi);
els.trackSort.addEventListener("change", reloadMidi);
els.resetBtn.addEventListener("click", resetProject);
els.deleteSelectedBtn.addEventListener("click", deleteSelectedTracks);
els.guideLineCount.addEventListener("input", () => {
  els.guideLineCountValue.textContent = els.guideLineCount.value;
  drawFrame(currentTime());
  saveState();
});
els.guideLineSpacing.addEventListener("input", () => {
  els.guideLineSpacingValue.textContent = els.guideLineSpacing.value;
  drawFrame(currentTime());
  saveState();
});
els.canvas.addEventListener("pointerdown", startDrag);
els.canvas.addEventListener("pointermove", dragCharacter);
els.canvas.addEventListener("pointerup", stopDrag);
els.canvas.addEventListener("pointercancel", stopDrag);
els.seek.addEventListener("input", () => {
  playOffset = Number(els.seek.value);
  drawFrame(playOffset);
  updateTime(playOffset);
});

for (const input of [els.videoWidth, els.videoHeight]) {
  input.addEventListener("change", resizeCanvas);
}

// 窗口大小改变时更新名称位置
window.addEventListener("resize", () => updateNameOverlay());

// 保存状态：当这些输入框变化时自动保存
for (const input of [els.videoWidth, els.videoHeight, els.fps, els.volume, els.transparentExport, els.lyricColor, els.lyricFont, els.lyricHeight]) {
  input.addEventListener("input", saveState);
  input.addEventListener("change", saveState);
}

// ==================== 画布尺寸调整 ====================
function resizeCanvas() {
  const width = clamp(Number(els.videoWidth.value) || 1280, 320, 3840);
  const height = clamp(Number(els.videoHeight.value) || 720, 240, 2160);
  els.canvas.width = width;
  els.canvas.height = height;
  els.canvas.style.aspectRatio = `${width} / ${height}`;
  els.canvas.style.setProperty("--aspect", String(width / height));
  syncPositionSliders();
  drawFrame(currentTime());
}

// ==================== MIDI 文件加载 ====================

// 重新加载已保存的 MIDI 文件（当轨道数量或排序方式改变时调用）
async function reloadMidi() {
  const saved = await loadSavedFile("midi");
  if (saved) {
    await loadMidiBuffer(await bufferFromBlob(saved.blob));
  }
}

// 从文件输入框加载 MIDI 文件
async function loadMidi() {
  const file = els.midiFile.files[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  await loadMidiBuffer(buffer);
  if (!restoring) {
    await saveFile("midi", file);
    saveState();
  }
}

// 解析 MIDI 缓冲区并初始化轨道
async function loadMidiBuffer(buffer) {
  try {
    const parsed = parseMidi(buffer);
    // 保存所有轨道（包括没有音符的）
    allTracks = parsed.tracks.map((track, index) => ({
      ...track,
      originalIndex: index,
      hasNotes: track.notes.length > 0,
    }));

    const tracksWithNotes = parsed.tracks.filter((track) => track.notes.length > 0);
    if (!tracksWithNotes.length) {
      throw new Error("这个 MIDI 没有可用音符轨道。");
    }

    // 更新音轨数量显示
    els.totalTracks.textContent = `/ ${allTracks.length}`;

    // 不自动添加轨道，让用户通过音轨选择器手动添加
    song = null;
    configs = [];
    els.tracks.innerHTML = "";

    // 计算最大时长（用于后续添加轨道时更新）
    const maxDuration = Math.max(...tracksWithNotes.flatMap((track) => track.notes.map((note) => note.end))) + 0.8;

    setStatus(`已载入 MIDI 文件，共 ${allTracks.length} 个轨道（${tracksWithNotes.length} 个有音符）。请在音轨选择器中选择要添加的轨道。`);
    renderTrackSelector();
    drawEmpty();
  } catch (error) {
    song = null;
    configs = [];
    allTracks = [];
    els.tracks.innerHTML = "";
    els.playBtn.disabled = true;
    els.stopBtn.disabled = true;
    els.renderBtn.disabled = true;
    els.layoutBtn.disabled = true;
    els.seek.disabled = true;
    setStatus(error.message || "MIDI 解析失败。", true);
    drawEmpty();
  }
}

// ==================== 图片加载 ====================

// 加载背景图片
async function loadBackground() {
  const file = els.backgroundFile.files[0];
  backgroundImageDataUrl = file ? await fileToDataUrl(file) : null;
  backgroundImage = backgroundImageDataUrl ? await imageFromDataUrl(backgroundImageDataUrl) : null;
  if (file && !restoring) await saveFile("background", file);
  if (!restoring) saveState();
  drawFrame(currentTime());
}

// 加载默认角色图片（闭嘴/张嘴）
async function loadDefaultImage(event, kind) {
  const file = event.currentTarget.files[0];
  if (!file) return;
  const dataUrl = await fileToDataUrl(file);
  const image = await imageFromDataUrl(dataUrl);
  if (kind === "closedImage") {
    defaultClosedImage = image;
    defaultClosedImageDataUrl = dataUrl;
    renderSwatch(els.defaultClosedSwatch, image);
    if (!restoring) await saveFile("defaultClosed", file);
  } else {
    defaultOpenImage = image;
    defaultOpenImageDataUrl = dataUrl;
    renderSwatch(els.defaultOpenSwatch, image);
    if (!restoring) await saveFile("defaultOpen", file);
  }
  refreshInheritedSwatches(kind);
  if (!restoring) saveState();
  drawFrame(currentTime());
}

// 根据音色编号、轨道名称和音域判断轨道类别
function classifyTrack(program, name, notes) {
  const nameLower = (name || "").toLowerCase();

  // 1. 检查轨道名称关键词
  const namePatterns = [
    { pattern: /vocal|voice|lead|melody|主唱|人声|主旋律/i, category: "VOCAL" },
    { pattern: /choir|harmony|backing|chorus|和声|合唱|背景/i, category: "HARMONY" },
    { pattern: /bass|贝斯|低音/i, category: "BASS" },
    { pattern: /drum|perc|kick|snare|hihat|鼓|打击/i, category: "DRUMS" },
    { pattern: /melody|主旋|旋律/i, category: "MELODY" },
    { pattern: /chord|pad|和弦|衬底/i, category: "CHORDS" },
  ];

  for (const { pattern, category } of namePatterns) {
    if (pattern.test(nameLower)) return TRACK_CATEGORIES[category];
  }

  // 2. 根据音色编号判断
  if (program >= 32 && program <= 39) return TRACK_CATEGORIES.BASS;
  if (program >= 52 && program <= 54) return TRACK_CATEGORIES.VOCAL;
  if (program >= 48 && program <= 51) return TRACK_CATEGORIES.HARMONY;
  if (program >= 80 && program <= 87) return TRACK_CATEGORIES.MELODY;

  // 3. 根据音域分析
  if (notes && notes.length > 0) {
    const pitches = notes.map((n) => n.pitch);
    const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    const range = maxPitch - minPitch;

    if (avgPitch < 55 && maxPitch < 67) return TRACK_CATEGORIES.BASS;
    if (avgPitch >= 55 && avgPitch <= 76 && range >= 12) return TRACK_CATEGORIES.VOCAL;
    if (avgPitch >= 48 && avgPitch <= 68 && range < 18) return TRACK_CATEGORIES.HARMONY;
  }

  return TRACK_CATEGORIES.OTHER;
}

function makeConfig(track, index, total) {
  const x = ((index + 1) / (total + 1)) * els.canvas.width;
  return {
    id: crypto.randomUUID(),
    name: track.name || `轨道 ${(track.originalIndex ?? track.index) + 1}`,
    originalIndex: track.originalIndex ?? track.index,
    enabled: true,
    showLyric: true,
    x,
    y: els.canvas.height * 0.68,
    scale: 1,
    tilt: 10,
    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    closedImage: null,
    openImage: null,
  };
}

// ==================== 轨道控制面板 ====================

// 渲染所有轨道的控制面板
function renderTrackControls() {
  els.tracks.innerHTML = "";
  song.tracks.forEach((track, index) => {
    const config = configs[index];
    const category = track.category || TRACK_CATEGORIES.OTHER;
    const card = document.createElement("article");
    card.className = "track";
    card.dataset.index = index;
    card.innerHTML = `
      <div class="track-head">
        <div class="track-head-left">
          <input type="checkbox" class="track-select-checkbox" data-index="${index}" title="选择此轨道" />
          <span class="track-category-badge" style="background: ${category.color}">${category.icon} ${category.name}</span>
          <label class="track-toggle">
            <input data-kind="enabled" type="checkbox" ${config.enabled ? "checked" : ""} />
            <input data-kind="name" type="text" class="track-name-input" value="${escapeHtml(config.name)}" title="点击编辑名称" />
          </label>
        </div>
        <div class="track-notes">${track.notes.length} notes</div>
      </div>
      <div class="preview">
        <label>
          <span>闭嘴图</span>
          <input data-kind="closedImage" type="file" accept="image/*" />
          <div class="swatch" data-swatch="closedImage">未选择</div>
        </label>
        <label>
          <span>张嘴图</span>
          <input data-kind="openImage" type="file" accept="image/*" />
          <div class="swatch" data-swatch="openImage">未选择</div>
        </label>
      </div>
      <div class="track-options">
        <label class="track-option-toggle" title="显示歌词">
          <input data-kind="showLyric" type="checkbox" ${config.showLyric !== false ? "checked" : ""} />
          <span>词</span>
        </label>
      </div>
      <div class="grid">
        <label>
          <span>X 位置</span>
          <input data-kind="x" type="range" min="0" max="${els.canvas.width}" value="${config.x}" step="1" />
        </label>
        <label>
          <span>Y 位置</span>
          <input data-kind="y" type="range" min="0" max="${els.canvas.height}" value="${config.y}" step="1" />
        </label>
        <label>
          <span>缩放</span>
          <div class="slider-with-input">
            <input data-kind="scale" type="range" min="0.1" max="5" value="${config.scale}" step="0.01" />
            <input data-kind="scale" type="number" class="slider-input" min="10" max="500" value="${Math.round(config.scale * 100)}" step="5" />
            <span class="slider-unit">%</span>
          </div>
        </label>
        <label>
          <span>Tilt 上限</span>
          <div class="slider-with-input">
            <input data-kind="tilt" type="range" min="0" max="28" value="${config.tilt}" step="1" />
            <input data-kind="tilt" type="number" class="slider-input" min="0" max="28" value="${config.tilt}" step="1" />
          </div>
        </label>
      </div>
    `;

    // 多选复选框事件
    const selectCheckbox = card.querySelector(".track-select-checkbox");
    if (selectCheckbox) {
      selectCheckbox.addEventListener("change", () => updateDeleteButton());
    }

    // 其他输入框事件
    for (const input of card.querySelectorAll("input:not(.track-select-checkbox)")) {
      input.addEventListener("input", (event) => updateConfig(event, index, card));
      input.addEventListener("change", (event) => updateConfig(event, index, card));
    }
    for (const kind of ["closedImage", "openImage"]) {
      if (!config[kind]) continue;
      const swatch = card.querySelector(`[data-swatch="${kind}"]`);
      renderSwatch(swatch, config[kind]);
    }
    for (const kind of ["closedImage", "openImage"]) {
      if (config[kind]) continue;
      const inherited = imageForKind(kind);
      if (inherited) renderSwatch(card.querySelector(`[data-swatch="${kind}"]`), inherited, "默认");
    }
    els.tracks.appendChild(card);
  });

  updateDeleteButton();
}

// 更新删除按钮状态
function updateDeleteButton() {
  const checkboxes = els.tracks.querySelectorAll(".track-select-checkbox");
  const checkedCount = Array.from(checkboxes).filter((cb) => cb.checked).length;
  els.deleteSelectedBtn.disabled = checkedCount === 0;
  els.deleteSelectedBtn.textContent = checkedCount > 0 ? `删除选中 (${checkedCount})` : "删除选中";
}

// 删除选中的轨道
function deleteSelectedTracks() {
  const checkboxes = els.tracks.querySelectorAll(".track-select-checkbox:checked");
  const indices = Array.from(checkboxes).map((cb) => Number(cb.dataset.index)).sort((a, b) => b - a);

  if (!indices.length) return;
  if (!confirm(`确定要删除选中的 ${indices.length} 个轨道吗？`)) return;

  // 从后往前删除，避免索引变化
  for (const index of indices) {
    song.tracks.splice(index, 1);
    configs.splice(index, 1);
  }

  // 更新时长
  if (song.tracks.length > 0) {
    song.duration = Math.max(...song.tracks.flatMap((t) => t.notes.map((n) => n.end))) + 0.8;
    els.seek.max = String(song.duration);
  } else {
    song = null;
    configs = [];
    els.seek.max = "0";
    els.seek.value = "0";
    els.playBtn.disabled = true;
    els.stopBtn.disabled = true;
    els.renderBtn.disabled = true;
    els.layoutBtn.disabled = true;
  }

  renderTrackControls();
  renderTrackSelector();
  drawFrame(currentTime());
  saveState();
  setStatus(`已删除 ${indices.length} 个轨道，当前剩余 ${song ? song.tracks.length : 0} 个轨道。`);
}

// ==================== 轨道选择器 ====================

// 渲染轨道选择器（显示所有音轨）
function renderTrackSelector() {
  if (!allTracks.length) {
    els.trackSelectorSection.style.display = "none";
    return;
  }

  els.trackSelectorSection.style.display = "block";
  els.trackSelector.innerHTML = "";

  // 获取当前已加载的轨道索引
  const loadedIndices = new Set(song ? song.tracks.map((t) => t.originalIndex) : []);

  allTracks.forEach((track) => {
    const isLoaded = loadedIndices.has(track.originalIndex);
    const configIndex = isLoaded ? song.tracks.findIndex((t) => t.originalIndex === track.originalIndex) : -1;
    const config = configIndex >= 0 ? configs[configIndex] : null;
    const isEnabled = config ? config.enabled : false;

    const item = document.createElement("label");
    item.className = `track-selector-item ${isLoaded ? (isEnabled ? "active" : "loaded") : ""}`;
    const category = track.category || TRACK_CATEGORIES.OTHER;
    item.innerHTML = `
      <input type="checkbox" data-track-original-index="${track.originalIndex}" ${isLoaded ? "checked" : ""} />
      <span class="track-selector-color" style="background: ${config ? config.color : '#666'}"></span>
      <span class="track-selector-category" style="background: ${category.color}">${category.icon} ${category.name}</span>
      <span class="track-selector-name">${escapeHtml(track.name || `轨道 ${track.originalIndex + 1}`)}</span>
      <span class="track-selector-notes">${track.notes.length} notes</span>
      ${!track.hasNotes ? '<span class="track-selector-empty">无音符</span>' : ""}
    `;
    item.querySelector("input").addEventListener("change", (e) => {
      const originalIndex = Number(e.target.dataset.trackOriginalIndex);
      if (e.target.checked) {
        // 添加轨道
        addTrackFromAll(originalIndex);
      } else {
        // 移除轨道
        removeTrackByOriginalIndex(originalIndex);
      }
    });
    els.trackSelector.appendChild(item);
  });
}

// 从所有轨道中添加指定轨道
function addTrackFromAll(originalIndex) {
  const track = allTracks.find((t) => t.originalIndex === originalIndex);
  if (!track || !track.hasNotes) return;

  // 处理歌词
  const processedTrack = {
    ...track,
    lyrics: track.lyrics.length ? lyricsFromNoteStarts(track.notes) : [],
  };

  if (!song) {
    // 如果还没有歌曲，创建一个新的
    song = {
      tracks: [],
      duration: 0,
    };
  }

  song.tracks.push(processedTrack);
  configs.push(makeConfig(processedTrack, configs.length, song.tracks.length));

  // 更新时长
  song.duration = Math.max(...song.tracks.flatMap((t) => t.notes.map((n) => n.end))) + 0.8;
  els.seek.max = String(song.duration);
  els.seek.disabled = false;
  els.playBtn.disabled = false;
  els.stopBtn.disabled = false;
  els.renderBtn.disabled = false;
  els.layoutBtn.disabled = false;

  renderTrackControls();
  renderTrackSelector();
  autoLayout();
  drawFrame(currentTime());
  saveState();
  setStatus(`已添加轨道，当前共 ${song.tracks.length} 个轨道。`);
}

// 根据原始索引移除轨道
function removeTrackByOriginalIndex(originalIndex) {
  if (!song) return;
  const index = song.tracks.findIndex((t) => t.originalIndex === originalIndex);
  if (index < 0) return;

  song.tracks.splice(index, 1);
  configs.splice(index, 1);

  // 更新时长
  if (song.tracks.length > 0) {
    song.duration = Math.max(...song.tracks.flatMap((t) => t.notes.map((n) => n.end))) + 0.8;
    els.seek.max = String(song.duration);
  } else {
    song = null;
    configs = [];
    els.seek.max = "0";
    els.seek.value = "0";
    els.playBtn.disabled = true;
    els.stopBtn.disabled = true;
    els.renderBtn.disabled = true;
    els.layoutBtn.disabled = true;
  }

  renderTrackControls();
  renderTrackSelector();
  drawFrame(currentTime());
  saveState();
  setStatus(`已移除轨道，当前剩余 ${song ? song.tracks.length : 0} 个轨道。`);
}

async function updateConfig(event, index, card) {
  const input = event.currentTarget;
  const kind = input.dataset.kind;
  const config = configs[index];
  if (input.type === "file") {
    const file = input.files[0];
    if (!file) return;
    config[`${kind}DataUrl`] = await fileToDataUrl(file);
    config[kind] = await imageFromDataUrl(config[`${kind}DataUrl`]);
    await saveFile(`track-${index}-${kind}`, file);
    const swatch = card.querySelector(`[data-swatch="${kind}"]`);
    renderSwatch(swatch, config[kind]);
  } else if (input.type === "checkbox") {
    config[kind] = input.checked;
    // 同步更新轨道选择器
    if (kind === "enabled") {
      renderTrackSelector();
    }
  } else if (input.tagName === "SELECT") {
    config[kind] = input.value;
  } else if (input.type === "text") {
    // 文本输入（名称）
    config[kind] = input.value.trim();
  } else {
    if (input.type === "number") {
      // Number input: convert percentage to decimal for scale
      if (kind === "scale") {
        config.scale = Number(input.value) / 100;
      } else {
        config[kind] = Number(input.value);
      }
      // Sync range slider
      const range = card.querySelector(`input[data-kind="${kind}"][type="range"]`);
      if (range) range.value = kind === "scale" ? config.scale : config[kind];
    } else {
      // Range slider
      config[kind] = Number(input.value);
      // Sync number input
      const numInput = card.querySelector(`input[data-kind="${kind}"][type="number"]`);
      if (numInput) numInput.value = kind === "scale" ? Math.round(config.scale * 100) : config[kind];
    }
  }
  saveState();
  drawFrame(currentTime());
}

function renderSwatch(swatch, image, label = "") {
  swatch.innerHTML = "";
  const clone = image.cloneNode();
  clone.alt = label;
  swatch.appendChild(clone);
}

function refreshInheritedSwatches(kind) {
  for (const [index, config] of configs.entries()) {
    if (config[kind]) continue;
    const card = els.tracks.children[index];
    const swatch = card?.querySelector(`[data-swatch="${kind}"]`);
    const inherited = imageForKind(kind);
    if (swatch && inherited) renderSwatch(swatch, inherited, "默认");
  }
}

function imageForKind(kind) {
  return kind === "closedImage" ? defaultClosedImage : defaultOpenImage;
}

function autoLayout() {
  if (!song) return;
  configs.forEach((config, index) => {
    config.x = ((index + 1) / (configs.length + 1)) * els.canvas.width;
    config.y = els.canvas.height * 0.68;
  });
  renderTrackControls();
  saveState();
  drawFrame(currentTime());
}

// 同步位置滑块的最大值（当画布尺寸改变时）
function syncPositionSliders() {
  for (const input of els.tracks.querySelectorAll('[data-kind="x"]')) {
    input.max = String(els.canvas.width);
  }
  for (const input of els.tracks.querySelectorAll('[data-kind="y"]')) {
    input.max = String(els.canvas.height);
  }
}

// ==================== 图片工具函数 ====================

// 从文件加载图片
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`图片载入失败：${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

// 将文件转换为 DataURL
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// 从 DataURL 创建图片对象
async function imageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ==================== 画布绘制 ====================

// 绘制一帧（主绘制函数）
function drawFrame(time, options = {}) {
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  drawBackground(options);
  drawGuideLines(options);

  if (!song) {
    if (!options.transparent) drawEmpty();
    updateNameOverlay();
    return;
  }

  song.tracks.forEach((track, index) => {
    const config = configs[index];
    if (!config || !config.enabled) return;
    const active = activeNotes(track, time);
    const note = active.length ? active.reduce((highest, current) => (current.pitch > highest.pitch ? current : highest)) : null;
    drawCharacter(config, note, time, index);
    drawLyric(config, track, time);
  });
  updateNameOverlay();
}

// 绘制背景（白色底 + 可选背景图片）
function drawBackground(options = {}) {
  if (options.transparent) return;
  const w = els.canvas.width;
  const h = els.canvas.height;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  if (backgroundImage) {
    drawCoverImage(backgroundImage, 0, 0, w, h);
  }
}

// 绘制辅助定位线（红色竖线）
function drawGuideLines(options = {}) {
  if (options.transparent) return;
  const count = Number(els.guideLineCount.value) || 0;
  if (count <= 0) return;
  const w = els.canvas.width;
  const h = els.canvas.height;
  const spacing = Number(els.guideLineSpacing.value) || 0;

  ctx.save();
  ctx.strokeStyle = "rgba(255, 0, 0, 0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);

  if (spacing > 0) {
    // 以画布中心为基准，按间距向两侧展开
    const centerX = w / 2;
    const halfCount = Math.floor(count / 2);
    const isOdd = count % 2 === 1;
    const positions = new Set();
    if (isOdd) positions.add(centerX);
    for (let i = 1; positions.size < count; i++) {
      const right = centerX + spacing * i;
      const left = centerX - spacing * i;
      if (right < w) positions.add(right);
      if (left > 0) positions.add(left);
      if (right >= w && left <= 0) break;
    }
    for (const x of [...positions].sort((a, b) => a - b)) {
      const rx = Math.round(x) + 0.5;
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx, h);
      ctx.stroke();
    }
  } else {
    // 等分画布宽度
    for (let i = 1; i <= count; i++) {
      const x = Math.round((w / (count + 1)) * i) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  ctx.setLineDash([]);
  ctx.restore();
}

// 绘制封面图片（保持比例裁剪填充）
function drawCoverImage(image, x, y, width, height) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

// 绘制空状态提示
function drawEmpty() {
  drawBackground();
  ctx.fillStyle = "#27313a";
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("选择 MIDI 后开始配置轨道人物", els.canvas.width / 2, els.canvas.height / 2);
}

// 绘制角色（根据是否有音符决定张嘴/闭嘴）
function drawCharacter(config, note, time, index) {
  const mouthOpen = isMouthOpen(song && song.tracks[index], note, time);
  const image = mouthOpen ? config.openImage || defaultOpenImage : config.closedImage || defaultClosedImage;
  const baseSize = Math.min(els.canvas.width, els.canvas.height) * CHARACTER_SIZE_RATIO * config.scale;
  const { pitchStretch, tilt } = characterDynamics(song && song.tracks[index], time, index, config.tilt);

  ctx.save();
  ctx.translate(config.x, config.y);
  ctx.transform(1, 0, Math.tan((tilt * Math.PI) / 180), 1, 0, 0);
  ctx.scale(1, pitchStretch);

  if (image) {
    const ratio = image.width / image.height || 1;
    const height = baseSize;
    const width = height * ratio;
    ctx.drawImage(image, -width / 2, -height, width, height);
  } else {
    drawPlaceholder(config, mouthOpen, baseSize);
  }
  ctx.restore();
}

// 更新画布外的人物名称标签
function updateNameOverlay() {
  const overlay = els.nameOverlay;
  if (!overlay) return;

  // 清空现有标签
  overlay.innerHTML = "";

  if (!song) return;

  // 获取画布的显示尺寸和实际尺寸的比例
  const canvasRect = els.canvas.getBoundingClientRect();
  const scaleX = canvasRect.width / els.canvas.width;
  const scaleY = canvasRect.height / els.canvas.height;

  song.tracks.forEach((track, index) => {
    const config = configs[index];
    if (!config.enabled || !config.name) return;

    // 计算标签位置（画布坐标转屏幕坐标）
    const labelX = config.x * scaleX;
    const labelY = config.y * scaleY;

    const label = document.createElement("div");
    label.className = "character-name-label";
    label.textContent = config.name;
    label.style.left = `${labelX}px`;
    label.style.top = `${labelY + 8}px`;
    label.style.transform = "translateX(-50%)";
    overlay.appendChild(label);
  });
}

// 判断嘴巴是否张开（连音时强制闭嘴 2 帧，让连奏更清晰）
function isMouthOpen(track, note, time) {
  if (!note || !track) return false;
  const fps = clamp(Number(els.fps.value) || 60, 12, 60);
  const gapTol = 1 / fps;
  const reart = track.notes.some((n) => n.start < note.start && n.end >= note.start - gapTol);
  if (reart && (time - note.start) < 2 / fps) return false;
  return true;
}

// 绘制占位符角色（当没有自定义图片时使用）
function drawPlaceholder(config, isOpen, size) {
  ctx.fillStyle = config.color;
  ctx.beginPath();
  ctx.roundRect(-size * 0.38, -size, size * 0.76, size, size * 0.16);
  ctx.fill();
  ctx.fillStyle = "#171b1f";
  ctx.beginPath();
  ctx.arc(-size * 0.16, -size * 0.64, size * 0.045, 0, Math.PI * 2);
  ctx.arc(size * 0.16, -size * 0.64, size * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#171b1f";
  ctx.lineWidth = Math.max(3, size * 0.035);
  ctx.beginPath();
  if (isOpen) {
    ctx.ellipse(0, -size * 0.42, size * 0.12, size * 0.18, 0, 0, Math.PI * 2);
  } else {
    ctx.moveTo(-size * 0.14, -size * 0.42);
    ctx.lineTo(size * 0.14, -size * 0.42);
  }
  ctx.stroke();
}

// 绘制歌词（带浮动动画和淡出效果）
function drawLyric(config, track, time) {
  // 检查是否显示歌词（优先使用轨道配置，否则使用全局设置）
  if (config.showLyric === false) return;
  if (els.lyricMode.value === "none") return;

  const lyric = currentLyric(track, time);
  if (!lyric) return;

  const age = time - lyric.time;
  const floatProgress = clamp(age / LYRIC_FLOAT_DURATION, 0, 1);
  const eased = 1 - (1 - floatProgress) ** 3;
  const fadeStart = LYRIC_FLOAT_DURATION + LYRIC_HOLD_DURATION;
  const alpha = age <= fadeStart ? 1 : 1 - clamp((age - fadeStart) / LYRIC_FADE_DURATION, 0, 1);
  if (alpha <= 0) return;

  const size = Math.min(els.canvas.width, els.canvas.height) * CHARACTER_SIZE_RATIO * config.scale;
  const x = clamp(config.x + Number(els.lyricX.value), 18, els.canvas.width - 18);
  const y = Math.max(32, config.y - size - 28 - Number(els.lyricHeight.value) - eased * 120);
  const sizeMultiplier = Number(els.lyricSize.value) / 100;
  const fontSize = clamp(size * 0.35 * sizeMultiplier, 18, 200);
  const maxWidth = Math.max(120, Math.min(els.canvas.width * 0.42, size * 2.8));
  const lyricFont = `700 ${fontSize}px ${els.lyricFont.value}`;
  // 根据全局模式决定显示的文本
  const displayText = els.lyricMode.value === "meow" ? "喵" : lyric.text;
  const lines = wrapText(displayText, maxWidth, lyricFont);
  const lineHeight = fontSize * 1.22;
  const textY = y - lines.length * lineHeight;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = els.lyricColor.value;
  ctx.font = lyricFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    ctx.fillText(line, x, textY + lineHeight * index + lineHeight / 2);
  });
  ctx.restore();
}

// 获取当前时间对应的歌词
function currentLyric(track, time) {
  if (!track.lyrics?.length) return null;
  let lyric = null;
  for (const candidate of track.lyrics) {
    if (candidate.time <= time) lyric = candidate;
    else break;
  }
  if (!lyric || time - lyric.time > LYRIC_TOTAL_DURATION) return null;
  return lyric;
}

// 文本自动换行（最多 3 行）
function wrapText(text, maxWidth, font) {
  ctx.save();
  ctx.font = font;
  const chars = Array.from(text);
  const lines = [];
  let line = "";
  for (const char of chars) {
    const next = line + char;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = char.trimStart();
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  ctx.restore();
  return lines.slice(0, 3);
}

// 测量文本宽度
function measureText(text) {
  return ctx.measureText(text).width;
}

// 获取当前时间活跃的音符
function activeNotes(track, time) {
  return track.notes.filter((note) => note.start <= time && note.end > time);
}

// 基于种子的随机倾斜（相同输入产生相同输出，保证动画一致性）
function seededTilt(time, index, pitch, maxTilt) {
  const bucket = Math.floor(time * 8);
  const seed = Math.sin((bucket + 1) * 9898.233 + index * 313.7 + pitch * 19.19) * 43758.5453;
  return (seed - Math.floor(seed) - 0.5) * 2 * maxTilt;
}

// 角色动态效果的缓动参数（需与 NativeRenderer 保持一致）
const DYNAMICS_ATTACK = 0.05;  // 音符开始时的缓入时间（秒）
const DYNAMICS_RELEASE = 0.18; // 音符结束后的缓出时间（秒）

// 平滑阶跃函数（0-1 范围）
function smoothstep01(x) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

// 连续倾斜方向 [-1, 1]：使用 smoothstep 插值让倾斜更平滑
function tiltDirection(time, index, pitch) {
  const dir = (bucket) => {
    const seed = Math.sin((bucket + 1) * 9898.233 + index * 313.7 + pitch * 19.19) * 43758.5453;
    return (seed - Math.floor(seed) - 0.5) * 2;
  };
  const f = time * 8;
  const b = Math.floor(f);
  return dir(b) + (dir(b + 1) - dir(b)) * smoothstep01(f - b);
}

// 角色动态效果：高度拉伸和倾斜（音符开始时缓入，结束后缓出）
function characterDynamics(track, time, index, maxTilt) {
  const attack = DYNAMICS_ATTACK;
  const release = DYNAMICS_RELEASE;
  const targetStretch = (pitch) => 1 + clamp((pitch - 55) / 24, -1, 1) * 0.2; // 55 = G3 base pitch

  // Deviation (pitchStretch - 1) and tilt left by a note's release tail at `time`.
  const releaseDevTilt = (note) => {
    if (!note) return { dev: 0, tilt: 0 };
    const relProg = (time - note.end) / release;
    if (relProg < 0 || relProg >= 1) return { dev: 0, tilt: 0 };
    const attackAtEnd = smoothstep01((note.end - note.start) / attack);
    const env = attackAtEnd * (1 - smoothstep01(relProg));
    return {
      dev: (targetStretch(note.pitch) - 1) * env,
      tilt: tiltDirection(time, index, note.pitch) * maxTilt * env,
    };
  };

  if (!track) return { pitchStretch: 1, tilt: 0 };
  const active = track.notes.filter((n) => n.start <= time && n.end > time);
  if (active.length) {
    const note = active.reduce((h, c) => (c.pitch > h.pitch ? c : h));
    // Crossfade from the height/tilt the previous note still has at this moment into
    // this note's target, so a new note grows from the current height (no instant jump).
    const attackProg = smoothstep01((time - note.start) / attack);
    const targetDev = targetStretch(note.pitch) - 1;
    const targetTilt = tiltDirection(time, index, note.pitch) * maxTilt;
    const before = track.notes.filter((n) => n.end <= note.start);
    const prev = before.length ? before.reduce((a, b) => (b.end > a.end ? b : a)) : null;
    const residual = releaseDevTilt(prev);
    return {
      pitchStretch: 1 + residual.dev + (targetDev - residual.dev) * attackProg,
      tilt: residual.tilt + (targetTilt - residual.tilt) * attackProg,
    };
  }
  const ended = track.notes.filter((n) => n.end <= time && time < n.end + release);
  if (ended.length) {
    const note = ended.reduce((a, b) => (b.end > a.end ? b : a));
    const r = releaseDevTilt(note);
    return { pitchStretch: 1 + r.dev, tilt: r.tilt };
  }
  return { pitchStretch: 1, tilt: 0 };
}

function playPreview() {
  if (!song || playing) return;
  playing = true;
  playStartedAt = performance.now() / 1000 - playOffset;
  scheduleAudio(playOffset);
  tick();
}

// ==================== 播放控制 ====================

// 停止预览
function stopPreview() {
  playing = false;
  playOffset = currentTime();
  stopAudio();
  cancelAnimationFrame(rafId);
  drawFrame(playOffset);
  updateTime(playOffset);
}

// 动画循环（每帧调用）
function tick() {
  if (!playing || !song) return;
  const time = currentTime();
  if (time >= song.duration) {
    playOffset = 0;
    playing = false;
    stopAudio();
    drawFrame(0);
    updateTime(0);
    return;
  }
  drawFrame(time);
  els.seek.value = String(time);
  updateTime(time);
  rafId = requestAnimationFrame(tick);
}

// 获取当前播放时间
function currentTime() {
  if (!playing) return playOffset;
  return performance.now() / 1000 - playStartedAt;
}

// 更新时间显示
function updateTime(time) {
  const duration = song?.duration || 0;
  els.timeText.textContent = `${formatTime(time)} / ${formatTime(duration)}`;
}

// ==================== 视频导出 ====================

// 渲染视频（主入口）
async function renderVideo() {
  if (!song) return;
  stopPreview();
  resizeCanvas();
  await renderVideoNative();
}

async function renderVideoNative() {
  if (location.protocol === "file:") {
    setStatus("请通过本地服务打开页面才能导出 MOV：node server.js", true);
    return;
  }
  els.renderBtn.disabled = true;
  try {
    setStatus("正在启动原生 GPU 渲染……");
    const payload = await buildRenderPayload();
    const startResponse = await fetch("/render-mov", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!startResponse.ok) throw new Error(await startResponse.text());
    const { id } = await startResponse.json();
    const output = await waitForRender(id);
    // The renderer already wrote the file to disk. ProRes 4K files are huge (often
    // many GB), so do NOT force a browser re-download into the Downloads folder —
    // that is what triggered "无法写文件". Just surface the saved path + a manual link.
    els.downloadLink.href = output.url;
    els.downloadLink.download = output.filename;
    els.downloadLink.hidden = false;
    setStatus(`MOV 已生成并保存在本地：${output.path}（文件较大，已直接存盘，无需重复下载）`);
  } catch (error) {
    setStatus(error.message || "MOV 导出失败。", true);
  } finally {
    els.renderBtn.disabled = false;
  }
}

async function renderVideoFromBrowserCanvas() {
  if (location.protocol === "file:") {
    setStatus("请通过本地服务打开页面才能导出 MOV：node server.js", true);
    return;
  }
  els.renderBtn.disabled = true;
  try {
    const transparent = els.transparentExport.checked;
    const fps = clamp(Number(els.fps.value) || 60, 12, 60);
    const startResponse = await fetch("/export-start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fps, transparent }),
    });
    if (!startResponse.ok) throw new Error(await startResponse.text());
    const { id } = await startResponse.json();
    const totalFrames = Math.ceil(song.duration * fps);

    for (let frame = 0; frame < totalFrames; frame += 1) {
      const time = frame / fps;
      drawFrame(time, { transparent });
      els.seek.value = String(time);
      updateTime(time);
      const percent = Math.floor(((frame + 1) / totalFrames) * 100);
      setStatus(`所见即所得导出 MOV：${percent}%（${frame + 1} / ${totalFrames} 帧）`);
      const blob = await canvasToBlob("image/png");
      const upload = await fetch(`/export-frame?id=${encodeURIComponent(id)}&index=${frame}`, {
        method: "POST",
        headers: { "content-type": "image/png" },
        body: blob,
      });
      if (!upload.ok) throw new Error(await upload.text());
      await nextPaint();
    }

    setStatus("正在合成 MOV，请保持页面打开。");
    const finishResponse = await fetch(`/export-finish?id=${encodeURIComponent(id)}`, { method: "POST" });
    if (!finishResponse.ok) throw new Error(await finishResponse.text());
    const output = await finishResponse.json();
    const link = document.createElement("a");
    link.href = output.url;
    link.download = output.filename;
    link.click();
    els.downloadLink.href = output.url;
    els.downloadLink.download = output.filename;
    els.downloadLink.hidden = false;
    setStatus(`MOV 已生成并保存在本地：${output.path}`);
  } catch (error) {
    setStatus(error.message || "MOV 导出失败。", true);
  } finally {
    els.renderBtn.disabled = false;
  }
}

// 画布转 Blob
function canvasToBlob(type, quality) {
  return new Promise((resolve, reject) => {
    els.canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("无法生成视频帧。"));
    }, type, quality);
  });
}

// 等待下一帧绘制
function nextPaint() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

// 等待渲染完成（轮询进度）
async function waitForRender(id) {
  while (true) {
    const response = await fetch(`/render-progress?id=${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(await response.text());
    const progress = await response.json();
    if (progress.status === "done") return progress.output;
    if (progress.status === "error") throw new Error(progress.error || "MOV 导出失败。");
    const total = progress.totalFrames || 0;
    const frame = progress.frame || 0;
    const percent = total ? Math.floor((frame / total) * 100) : 0;
    setStatus(`本地渲染 MOV：${percent}%（${frame} / ${total} 帧）`);
    await delay(500);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildRenderPayload() {
  return {
    width: els.canvas.width,
    height: els.canvas.height,
    fps: clamp(Number(els.fps.value) || 60, 12, 60),
    duration: song.duration,
    transparent: els.transparentExport.checked,
    format: els.exportFormat.value,
    lyricColor: els.lyricColor.value,
    lyricFont: els.lyricFont.value,
    lyricHeight: Number(els.lyricHeight.value),
    lyricMode: els.lyricMode.value,
    tracks: song.tracks.map((track) => ({
      notes: track.notes,
      lyrics: track.lyrics,
      category: track.category || TRACK_CATEGORIES.OTHER,
    })),
    configs: configs.map((config) => ({
      x: config.x,
      y: config.y,
      scale: config.scale,
      tilt: config.tilt,
      color: config.color,
      showLyric: config.showLyric,
    })),
    images: {
      background: backgroundImageDataUrl,
      defaultClosed: defaultClosedImageDataUrl,
      defaultOpen: defaultOpenImageDataUrl,
      tracks: await Promise.all(configs.map(async (config) => ({
        closed: config.closedImageDataUrl || null,
        open: config.openImageDataUrl || null,
      }))),
    },
  };
}

function startDrag(event) {
  if (!song) return;
  const point = canvasPoint(event);
  draggedTrackIndex = hitTrack(point.x, point.y);
  if (draggedTrackIndex < 0) return;
  els.canvas.classList.add("dragging");
  els.canvas.setPointerCapture(event.pointerId);
}

function dragCharacter(event) {
  if (draggedTrackIndex < 0) return;
  const point = canvasPoint(event);
  const config = configs[draggedTrackIndex];
  config.x = clamp(point.x, 0, els.canvas.width);
  config.y = clamp(point.y, 0, els.canvas.height);
  syncTrackPositionInputs(draggedTrackIndex);
  drawFrame(currentTime());
}

function stopDrag(event) {
  if (draggedTrackIndex < 0) return;
  draggedTrackIndex = -1;
  els.canvas.classList.remove("dragging");
  if (els.canvas.hasPointerCapture(event.pointerId)) {
    els.canvas.releasePointerCapture(event.pointerId);
  }
}

function canvasPoint(event) {
  const rect = els.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * els.canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * els.canvas.height,
  };
}

function hitTrack(x, y) {
  let bestIndex = -1;
  let bestDistance = Infinity;
  configs.forEach((config, index) => {
    const radius = Math.min(els.canvas.width, els.canvas.height) * CHARACTER_SIZE_RATIO * 0.75 * config.scale;
    const dx = x - config.x;
    const dy = y - (config.y - radius * 0.55);
    const distance = Math.hypot(dx, dy);
    if (distance <= radius && distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function syncTrackPositionInputs(index) {
  const card = els.tracks.children[index];
  if (!card) return;
  const config = configs[index];
  const xInput = card.querySelector('[data-kind="x"]');
  const yInput = card.querySelector('[data-kind="y"]');
  if (xInput) xInput.value = String(config.x);
  if (yInput) yInput.value = String(config.y);
  saveState();
}

async function saveFile(key, file) {
  await idbSet(key, { name: file.name, type: file.type, blob: file });
}

async function loadSavedFile(key) {
  const fromDb = await idbGet(key);
  if (fromDb) return fromDb;
  const raw = localStorage.getItem(`${STORE_NAME}:${key}`);
  if (!raw) return null;
  const legacy = JSON.parse(raw);
  const blob = await fetch(legacy.dataUrl).then((response) => response.blob());
  const saved = { name: legacy.name, type: legacy.type, blob };
  await idbSet(key, saved);
  localStorage.removeItem(`${STORE_NAME}:${key}`);
  return saved;
}

async function imageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function bufferFromBlob(blob) {
  return blob.arrayBuffer();
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readonly");
    const request = tx.objectStore("files").get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

function saveState() {
  if (restoring) return;
  localStorage.setItem(
    STORE_NAME,
    JSON.stringify({
      videoWidth: els.videoWidth.value,
      videoHeight: els.videoHeight.value,
      fps: els.fps.value,
      volume: els.volume.value,
      transparentExport: els.transparentExport.checked,
      lyricColor: els.lyricColor.value,
      lyricMode: els.lyricMode.value,
      lyricFont: els.lyricFont.value,
      lyricHeight: els.lyricHeight.value,
      guideLineCount: els.guideLineCount.value,
      guideLineSpacing: els.guideLineSpacing.value,
      selectedTracks: song ? song.tracks.map((t) => t.originalIndex) : [],
      configs: configs.map((config) => ({
        enabled: config.enabled,
        showLyric: config.showLyric,
        x: config.x,
        y: config.y,
        scale: config.scale,
        tilt: config.tilt,
      })),
    }),
  );
}

async function restoreState() {
  restoring = true;
  try {
    const raw = localStorage.getItem(STORE_NAME);
    const state = raw ? JSON.parse(raw) : null;
    if (state) {
      els.videoWidth.value = state.videoWidth ?? els.videoWidth.value;
      els.videoHeight.value = state.videoHeight ?? els.videoHeight.value;
      els.fps.value = state.fps ?? els.fps.value;
      els.volume.value = state.volume ?? els.volume.value;
      els.transparentExport.checked = Boolean(state.transparentExport);
      els.lyricColor.value = state.lyricColor ?? els.lyricColor.value;
      els.lyricMode.value = state.lyricMode ?? els.lyricMode.value;
      els.lyricFont.value = state.lyricFont ?? els.lyricFont.value;
      els.lyricHeight.value = state.lyricHeight ?? els.lyricHeight.value;
      els.guideLineCount.value = state.guideLineCount ?? els.guideLineCount.value;
      els.guideLineCountValue.textContent = els.guideLineCount.value;
      els.guideLineSpacing.value = state.guideLineSpacing ?? els.guideLineSpacing.value;
      els.guideLineSpacingValue.textContent = els.guideLineSpacing.value;
    }
    resizeCanvas();

    const background = await loadSavedFile("background");
    if (background) {
      backgroundImageDataUrl = await blobToDataUrl(background.blob);
      backgroundImage = await imageFromDataUrl(backgroundImageDataUrl);
    }

    const defaultClosed = await loadSavedFile("defaultClosed");
    if (defaultClosed) {
      defaultClosedImageDataUrl = await blobToDataUrl(defaultClosed.blob);
      defaultClosedImage = await imageFromDataUrl(defaultClosedImageDataUrl);
      renderSwatch(els.defaultClosedSwatch, defaultClosedImage);
    }

    const defaultOpen = await loadSavedFile("defaultOpen");
    if (defaultOpen) {
      defaultOpenImageDataUrl = await blobToDataUrl(defaultOpen.blob);
      defaultOpenImage = await imageFromDataUrl(defaultOpenImageDataUrl);
      renderSwatch(els.defaultOpenSwatch, defaultOpenImage);
    }

    const midi = await loadSavedFile("midi");
    if (midi) {
      await loadMidiBuffer(await bufferFromBlob(midi.blob));
      // 恢复之前选中的轨道
      if (state?.selectedTracks && state.selectedTracks.length) {
        for (const originalIndex of state.selectedTracks) {
          addTrackFromAll(originalIndex);
        }
        // 恢复每个轨道的配置
        if (state?.configs) {
          state.configs.forEach((saved, index) => {
            if (!configs[index]) return;
            Object.assign(configs[index], saved);
          });
        }
      }
      for (const [index, config] of configs.entries()) {
        for (const kind of ["closedImage", "openImage"]) {
          const saved = await loadSavedFile(`track-${index}-${kind}`);
          if (saved) {
            config[`${kind}DataUrl`] = await blobToDataUrl(saved.blob);
            config[kind] = await imageFromDataUrl(config[`${kind}DataUrl`]);
          }
        }
      }
      renderTrackControls();
      renderTrackSelector();
    }
    drawFrame(currentTime());
  } finally {
    restoring = false;
  }
}

async function resetProject() {
  if (!confirm("确定要重置项目吗？所有保存的设置和文件将被清除。")) return;
  stopPreview();
  localStorage.removeItem(STORE_NAME);
  const db = await openDb();
  const tx = db.transaction("files", "readwrite");
  tx.objectStore("files").clear();
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
  db.close();
  song = null;
  configs = [];
  allTracks = [];
  backgroundImage = null;
  backgroundImageDataUrl = null;
  defaultClosedImage = null;
  defaultClosedImageDataUrl = null;
  defaultOpenImage = null;
  defaultOpenImageDataUrl = null;
  els.tracks.innerHTML = "";
  els.trackSelector.innerHTML = "";
  els.trackSelectorSection.style.display = "none";
  els.deleteSelectedBtn.disabled = true;
  els.deleteSelectedBtn.textContent = "删除选中";
  els.midiFile.value = "";
  els.backgroundFile.value = "";
  els.defaultClosedImage.value = "";
  els.defaultOpenImage.value = "";
  els.defaultClosedSwatch.textContent = "未选择";
  els.defaultOpenSwatch.textContent = "未选择";
  els.playBtn.disabled = true;
  els.stopBtn.disabled = true;
  els.renderBtn.disabled = true;
  els.layoutBtn.disabled = true;
  els.seek.disabled = true;
  els.seek.value = "0";
  els.downloadLink.hidden = true;
  els.videoWidth.value = "3840";
  els.videoHeight.value = "2160";
  els.fps.value = "60";
  els.volume.value = "0.25";
  els.transparentExport.checked = false;
  els.trackCount.value = "8";
  els.trackCount.max = "16";
  els.totalTracks.textContent = "/ 0";
  els.trackSort.selectedIndex = 0;
  els.lyricColor.value = "#171b1f";
  els.lyricFont.selectedIndex = 0;
  els.lyricSize.value = "100";
  els.lyricSizeValue.textContent = "100%";
  els.lyricX.value = "0";
  els.lyricXValue.textContent = "0";
  els.lyricHeight.value = "0";
  els.guideLineCount.value = "0";
  els.guideLineCountValue.textContent = "0";
  els.guideLineSpacing.value = "0";
  els.guideLineSpacingValue.textContent = "0";
  resizeCanvas();
  drawEmpty();
  setStatus("项目已重置，请选择一个 MIDI 文件。");
}

function scheduleAudio(offset) {
  const graph = buildAudioGraph(offset);
  if (!graph) return;
  audioContext = graph.context;
  activeOscillators = graph.oscillators;
  graph.start();
}

function stopAudio() {
  for (const osc of activeOscillators) {
    try {
      osc.stop();
    } catch {
      // Already stopped.
    }
  }
  activeOscillators = [];
}

function buildAudioGraph(offset) {
  if (!song) return null;
  const context = new AudioContext();
  const destination = context.createMediaStreamDestination();
  const master = context.createGain();
  master.gain.value = Number(els.volume.value);
  master.connect(context.destination);
  master.connect(destination);

  const oscillators = [];
  const startAt = context.currentTime + 0.08;
  for (const track of song.tracks) {
    for (const note of track.notes) {
      if (note.end <= offset) continue;
      const osc = context.createOscillator();
      const gain = context.createGain();
      const noteStart = startAt + Math.max(0, note.start - offset);
      const noteEnd = startAt + note.end - offset;
      osc.type = "sine";
      osc.frequency.value = 440 * 2 ** ((note.pitch - 69) / 12);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.02, note.velocity * 0.13), noteStart + 0.02);
      gain.gain.setValueAtTime(Math.max(0.02, note.velocity * 0.13), Math.max(noteStart + 0.03, noteEnd - 0.04));
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      osc.connect(gain);
      gain.connect(master);
      osc.start(noteStart);
      osc.stop(noteEnd + 0.02);
      oscillators.push(osc);
    }
  }

  return {
    context,
    oscillators,
    destinationStream: destination.stream,
    start: () => context.resume(),
    stop: () => {
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {
          // Already stopped.
        }
      }
      context.close();
    },
  };
}

function parseMidi(buffer) {
  const view = new DataView(buffer);
  let pos = 0;

  function readString(length) {
    let value = "";
    for (let i = 0; i < length; i += 1) value += String.fromCharCode(view.getUint8(pos++));
    return value;
  }

  function readUint16() {
    const value = view.getUint16(pos);
    pos += 2;
    return value;
  }

  function readUint32() {
    const value = view.getUint32(pos);
    pos += 4;
    return value;
  }

  if (readString(4) !== "MThd") throw new Error("不是有效的 MIDI 文件。");
  const headerLength = readUint32();
  const format = readUint16();
  const trackCount = readUint16();
  const division = readUint16();
  pos += headerLength - 6;
  if (division & 0x8000) throw new Error("暂不支持 SMPTE 时间格式的 MIDI。");

  const ticksPerBeat = division;
  const rawTracks = [];
  const tempos = [{ tick: 0, mpqn: 500000 }];

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    if (readString(4) !== "MTrk") throw new Error("MIDI 轨道块损坏。");
    const length = readUint32();
    const end = pos + length;
    const state = { tick: 0, runningStatus: 0, notes: [], lyrics: [], open: new Map(), name: "", program: 0 };

    while (pos < end) {
      state.tick += readVarLen(view, () => pos++);
      let status = view.getUint8(pos++);
      if (status < 0x80) {
        pos -= 1;
        status = state.runningStatus;
      } else {
        state.runningStatus = status;
      }

      if (status === 0xff) {
        const type = view.getUint8(pos++);
        const metaLength = readVarLen(view, () => pos++);
        if (type === 0x03) {
          state.name = readMetaText(view, pos, metaLength);
        } else if (type === 0x05 || type === 0x01) {
          const text = readMetaText(view, pos, metaLength);
          if (text) state.lyrics.push({ tick: state.tick, text: "喵" });
        } else if (type === 0x51 && metaLength === 3) {
          const mpqn = (view.getUint8(pos) << 16) | (view.getUint8(pos + 1) << 8) | view.getUint8(pos + 2);
          tempos.push({ tick: state.tick, mpqn });
        }
        pos += metaLength;
        continue;
      }

      if (status === 0xf0 || status === 0xf7) {
        const sysexLength = readVarLen(view, () => pos++);
        pos += sysexLength;
        continue;
      }

      const eventType = status >> 4;
      const channel = status & 0x0f;
      const data1 = view.getUint8(pos++);
      const needsSecond = ![0xc, 0xd].includes(eventType);
      const data2 = needsSecond ? view.getUint8(pos++) : 0;

      if (eventType === 0x9 && data2 > 0) {
        const key = `${channel}:${data1}`;
        if (!state.open.has(key)) state.open.set(key, []);
        state.open.get(key).push({ tick: state.tick, pitch: data1, velocity: data2 / 127 });
      } else if (eventType === 0x8 || (eventType === 0x9 && data2 === 0)) {
        const key = `${channel}:${data1}`;
        const stack = state.open.get(key);
        const started = stack?.shift();
        if (started && state.tick > started.tick) {
          state.notes.push({
            pitch: started.pitch,
            velocity: started.velocity,
            startTick: started.tick,
            endTick: state.tick,
          });
        }
      } else if (eventType === 0xc) {
        // Program Change - 记录音色
        state.program = data1;
      }
    }

    rawTracks.push({ index: trackIndex, name: state.name, notes: state.notes, lyrics: state.lyrics, program: state.program });
    pos = end;
  }

  const tempoMap = tempos.sort((a, b) => a.tick - b.tick).reduce((map, tempo) => {
    if (map.length && map[map.length - 1].tick === tempo.tick) {
      map[map.length - 1] = tempo;
    } else {
      map.push(tempo);
    }
    return map;
  }, []);
  const tracks = rawTracks.map((track) => ({
    ...track,
    notes: track.notes.map((note) => ({
      pitch: note.pitch,
      velocity: note.velocity,
      start: tickToSeconds(note.startTick, tempoMap, ticksPerBeat),
      end: tickToSeconds(note.endTick, tempoMap, ticksPerBeat),
    })),
    lyrics: mergeCloseLyrics(track.lyrics.map((lyric) => ({
      text: lyric.text,
      time: tickToSeconds(lyric.tick, tempoMap, ticksPerBeat),
    }))),
    category: classifyTrack(track.program, track.name, track.notes),
  }));

  return { format, ticksPerBeat, tempoMap, tracks };
}

function mergeCloseLyrics(lyrics) {
  const sorted = [...lyrics].sort((a, b) => a.time - b.time);
  const merged = [];
  for (const lyric of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && lyric.time - previous.time < 0.02) {
      previous.text = lyric.text;
    } else {
      merged.push({ ...lyric });
    }
  }
  return merged;
}

function lyricsFromNoteStarts(notes) {
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  const lyrics = [];
  for (const note of sorted) {
    const previous = lyrics[lyrics.length - 1];
    if (previous && note.start - previous.time < 0.1) {
      continue;
    }
    lyrics.push({ text: "喵", time: note.start });
  }
  return lyrics;
}

function readVarLen(view, advance) {
  let value = 0;
  let byte = 0;
  do {
    byte = view.getUint8(advance());
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80);
  return value;
}

function readMetaText(view, offset, length) {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
  try {
    return new TextDecoder("utf-8").decode(bytes).replace(/\0/g, "").trim();
  } catch {
    return "";
  }
}

function tickToSeconds(tick, tempoMap, ticksPerBeat) {
  let seconds = 0;
  for (let i = 0; i < tempoMap.length; i += 1) {
    const current = tempoMap[i];
    const next = tempoMap[i + 1];
    const segmentEnd = next ? Math.min(tick, next.tick) : tick;
    if (segmentEnd > current.tick) {
      seconds += ((segmentEnd - current.tick) * current.mpqn) / ticksPerBeat / 1_000_000;
    }
    if (!next || tick < next.tick) break;
  }
  return seconds;
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("error", isError);
}

function formatTime(time) {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const hundredths = Math.floor((time % 1) * 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

resizeCanvas();
drawEmpty();
restoreState();