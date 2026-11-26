// 动作识别练习：MediaPipe 姿态关键点 + 浏览器内 k 近邻分类。全部在本地运行，不上传画面。
import { PoseLandmarker, FilesetResolver } from './vendor/vision_bundle.mjs';

const $ = (id) => document.getElementById(id);
const T = (zh, en) => (window.TOOL ? TOOL.t(zh, en) : zh);
const video = $('video'), view = $('view'), ctx = view.getContext('2d');
const CONN = PoseLandmarker.POSE_CONNECTIONS;

let landmarker = null, imageLandmarker = null, running = false, lastTs = -1, mode = 'pose';
let recording = null, recUntil = 0;
const samples = { A: [], B: [] };
let model = null;               // { mean, std, data:[{x, y}] }
const recent = [];              // 最近几帧的预测，用来平滑
let lastFeat = null;

function status(zh, en) { $('status').textContent = T(zh, en); }

async function init() {
  const files = await FilesetResolver.forVisionTasks('./vendor/wasm');
  const opts = (delegate, runningMode) => ({ baseOptions: { modelAssetPath: './vendor/pose_landmarker_lite.task', delegate }, runningMode, numPoses: 2 });
  try { landmarker = await PoseLandmarker.createFromOptions(files, opts('GPU', 'VIDEO')); }
  catch (e) { landmarker = await PoseLandmarker.createFromOptions(files, opts('CPU', 'VIDEO')); }
  window.__poseFiles = files; window.__poseOpts = opts;
  status('模型已就绪。选择摄像头、示例视频，或上传一段视频。', 'Model ready. Choose the camera, the demo video, or upload a video.');
}

// ---------- 画面来源 ----------
function stopStream() {
  if (video.srcObject) { video.srcObject.getTracks().forEach((t) => t.stop()); video.srcObject = null; }
}
async function useCamera() {
  stopStream();
  try {
    video.removeAttribute('src');
    video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 540 }, audio: false });
    await video.play(); loop();
    status('摄像头已打开。站远一点，让全身都在画面里。', 'Camera on. Step back so your whole body is in view.');
  } catch (e) {
    status('打不开摄像头：请在浏览器地址栏允许摄像头，或改用示例视频、上传视频。', 'Cannot open the camera. Allow it in the address bar, or use the demo or an uploaded video.');
  }
}
async function useUrl(url) {
  stopStream(); video.src = url; await video.play(); loop();
  status('正在识别视频画面。', 'Detecting poses in the video.');
}
async function useImage(file) {
  stopStream(); video.pause(); running = false;
  const img = new Image(); img.src = URL.createObjectURL(file); await img.decode();
  if (!imageLandmarker) imageLandmarker = await PoseLandmarker.createFromOptions(window.__poseFiles, window.__poseOpts('CPU', 'IMAGE'));
  view.width = img.naturalWidth; view.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);
  const res = imageLandmarker.detect(img);
  draw(res, false);
  status('图片识别完成。', 'Image done.');
}

// ---------- 主循环 ----------
function loop() {
  if (running) return; running = true;
  const step = () => {
    if (!running) return;
    if (video.readyState >= 2 && landmarker) {
      if (view.width !== video.videoWidth) { view.width = video.videoWidth; view.height = video.videoHeight; }
      ctx.drawImage(video, 0, 0, view.width, view.height);
      let ts = performance.now(); if (ts <= lastTs) ts = lastTs + 1; lastTs = ts;
      const res = landmarker.detectForVideo(video, ts);
      draw(res, true);
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function draw(res, live) {
  // 同一个人有时会被识别两次：两套骨架的躯干中心挨得很近时只留第一套
  const people = [];
  const mid = (lm) => [(lm[11].x + lm[12].x + lm[23].x + lm[24].x) / 4, (lm[11].y + lm[12].y + lm[23].y + lm[24].y) / 4];
  (res.landmarks || []).forEach((lm) => { const c = mid(lm); if (!people.some((q) => Math.hypot(mid(q)[0] - c[0], mid(q)[1] - c[1]) < 0.1)) people.push(lm); });
  const W = view.width, H = view.height, lw = Math.max(2, W / 300);
  let vis = 0, conf = 0;
  people.forEach((lm, pi) => {
    ctx.lineWidth = lw; ctx.strokeStyle = pi === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,220,120,0.9)';
    CONN.forEach(({ start, end }) => {
      const a = lm[start], b = lm[end];
      ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H); ctx.stroke();
    });
    lm.forEach((p) => {
      const v = p.visibility ?? 1;
      if (pi === 0) { conf += v; if (v >= 0.6) vis++; }
      ctx.fillStyle = v >= 0.6 ? '#2ECC71' : '#E74C3C';
      ctx.beginPath(); ctx.arc(p.x * W, p.y * H, lw * 2, 0, Math.PI * 2); ctx.fill();
    });
  });
  $('mPeople').textContent = people.length;
  $('mVisible').textContent = people.length ? vis : '-';
  $('mConf').textContent = people.length ? Math.round(conf / 33 * 100) + '%' : '-';
  lastFeat = people.length ? features(people[0]) : null;
  if (mode === 'cls' && live) classifyStep();
}

// ---------- 特征：几个关节角和膝间距 ----------
function angle(a, b, c) {
  const v1 = [a.x - b.x, a.y - b.y], v2 = [c.x - b.x, c.y - b.y];
  const d = Math.hypot(...v1) * Math.hypot(...v2) || 1;
  return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / d))) * 180 / Math.PI;
}
function features(lm) {
  const [ls, rs, lh, rh, lk, rk, la, ra] = [11, 12, 23, 24, 25, 26, 27, 28].map((i) => lm[i]);
  const hipW = Math.hypot(lh.x - rh.x, lh.y - rh.y) || 0.01;
  return [
    angle(lh, lk, la), angle(rh, rk, ra),             // 两侧膝角
    angle(ls, lh, lk), angle(rs, rh, rk),             // 两侧髋角
    Math.abs(lk.x - rk.x) / hipW,                      // 膝间距 / 髋宽
    Math.abs(la.x - ra.x) / hipW,                      // 踝间距 / 髋宽
    (Math.abs(lk.x - rk.x) / (Math.abs(la.x - ra.x) || 0.01)), // 膝间距 / 踝间距，内扣时变小
  ];
}

// ---------- 采集、训练、预测 ----------
function record(cls) {
  if (!running) { status('先打开摄像头或播放视频，再录样本。', 'Start the camera or a video first.'); return; }
  recording = cls; recUntil = performance.now() + 3000;
  status('正在录“' + $('name' + cls).value + '”，请持续做这个动作……', 'Recording ' + $('name' + cls).value + '...');
  const tick = () => {
    if (performance.now() > recUntil) { recording = null; status('录好了。两类都录完后点“训练”。', 'Done. Train when both classes are recorded.'); return; }
    if (lastFeat) { samples[cls].push(lastFeat); $('n' + cls).textContent = samples[cls].length; }
    setTimeout(tick, 100);
  };
  tick();
}
function train() {
  if (samples.A.length < 5 || samples.B.length < 5) { status('每类至少要 5 个样本。', 'Each class needs at least 5 samples.'); return; }
  const all = [...samples.A, ...samples.B], n = all[0].length;
  const mean = Array.from({ length: n }, (_, j) => all.reduce((s, r) => s + r[j], 0) / all.length);
  const std = Array.from({ length: n }, (_, j) => Math.sqrt(all.reduce((s, r) => s + (r[j] - mean[j]) ** 2, 0) / all.length) || 1);
  const z = (r) => r.map((v, j) => (v - mean[j]) / std[j]);
  model = { mean, std, z, data: [...samples.A.map((r) => ({ x: z(r), y: 'A' })), ...samples.B.map((r) => ({ x: z(r), y: 'B' }))] };
  recent.length = 0;
  status('训练完成：共 ' + all.length + ' 个样本。现在请没参加录制的同学来做动作。', 'Trained on ' + all.length + ' samples. Now test it on someone who did not record.');
}
function classifyStep() {
  if (!model) { $('pred').textContent = ''; $('bar').style.width = '0'; return; }
  if (!lastFeat) { $('pred').textContent = T('没有看到人', 'No person'); $('bar').style.width = '0'; return; }
  const x = model.z(lastFeat), k = Math.min(7, model.data.length);
  const nn = model.data.map((d) => ({ y: d.y, dist: Math.hypot(...d.x.map((v, j) => v - x[j])) })).sort((a, b) => a.dist - b.dist).slice(0, k);
  const pA = nn.filter((d) => d.y === 'A').length / k;
  recent.push(pA); if (recent.length > 6) recent.shift();
  const p = recent.reduce((s, v) => s + v, 0) / recent.length;
  const cls = p >= 0.5 ? 'A' : 'B', sure = Math.round((cls === 'A' ? p : 1 - p) * 100);
  $('pred').textContent = $('name' + cls).value + '　' + T('把握 ', 'confidence ') + sure + '%';
  $('bar').style.width = sure + '%';
}

// ---------- 界面 ----------
function setMode(m) {
  mode = m;
  $('posePanel').classList.toggle('hidden', m !== 'pose');
  $('clsPanel').classList.toggle('hidden', m !== 'cls');
  $('tabPose').classList.toggle('primary', m === 'pose');
  $('tabCls').classList.toggle('primary', m === 'cls');
  $('pred').textContent = ''; $('bar').style.width = '0';
  $('pred').classList.toggle('hidden', m !== 'cls'); $('barWrap').classList.toggle('hidden', m !== 'cls');
}
$('tabPose').onclick = () => setMode('pose');
$('tabCls').onclick = () => setMode('cls');
$('srcCam').onclick = useCamera;
$('srcDemo').onclick = () => useUrl('./demo_squat.mp4');
$('file').onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  if (f.type.startsWith('image/')) useImage(f); else useUrl(URL.createObjectURL(f));
};
$('recA').onclick = () => record('A');
$('recB').onclick = () => record('B');
$('trainBtn').onclick = train;
$('clearBtn').onclick = () => {
  samples.A = []; samples.B = []; model = null; $('nA').textContent = '0'; $('nB').textContent = '0';
  ['A1', 'A0', 'B1', 'B0'].forEach((k) => ($('c' + k).textContent = '0')); setMode('cls');
};
document.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { const el = $('c' + b.dataset.t); el.textContent = +el.textContent + 1; }));
['A', 'B'].forEach((c) => ($('name' + c).oninput = () => ($('t' + c).textContent = $('name' + c).value)));
$('snapBtn').onclick = () => { const a = document.createElement('a'); a.download = 'pose.png'; a.href = view.toDataURL('image/png'); a.click(); };
setMode('pose');
init().catch((e) => { console.error(e); status('模型加载失败，请刷新页面重试。', 'Failed to load the model. Please reload.'); });
