import {
    waitForHostReady,
    SURFACE,
    applySurface,
} from '/scripts/tauritavern/layout-kit.js';
import {
    AGENT_SYSTEM_MODULE_NAME,
    AGENT_SYSTEM_SETTINGS_CHANGED,
    AGENT_SYSTEM_SETTINGS_KEY,
    DEFAULT_AGENT_SYSTEM_SETTINGS,
} from '/scripts/tauritavern/agent/agent-system-settings.js';
import {
    getActiveAgentRun,
    subscribeAgentRunEvents,
    subscribeAgentRunState,
} from '/scripts/tauritavern/agent/agent-run-controller.js';

const MODULE_NAME = 'agent-workspace-float';
const SETTINGS_KEY = 'settings';
const RUN_EVENT_TAIL_SEQ = Number.MAX_SAFE_INTEGER;
const RUN_EVENT_PAGE_LIMIT = 240;
const MIN_PANEL_WIDTH = 360;
const MIN_PANEL_HEIGHT = 360;
const CUSTOM_ROOT_ID = '__custom__';

const TEXT = Object.freeze({
    title: 'Agent \u5de5\u4f5c\u533a',
    waitingRun: '\u7b49\u5f85 Agent \u8fd0\u884c',
    workspaceTab: '\u5de5\u4f5c\u533a\u67e5\u770b',
    settingsTab: '\u914d\u7f6e',
    refresh: '\u5237\u65b0',
    selectFile: '\u8bf7\u9009\u62e9\u6587\u4ef6',
    fontSize: '\u67e5\u770b\u5b57\u53f7',
    rootsTitle: '\u5de5\u4f5c\u533a\u6839\u76ee\u5f55',
    rootsHelp: '\u53ea\u63d0\u53d6\u52fe\u9009\u76ee\u5f55\u4e0b\u7684\u6587\u4ef6\uff0c\u672a\u52fe\u9009\u76ee\u5f55\u4e2d\u7684\u4e8b\u4ef6\u8def\u5f84\u4f1a\u88ab\u5ffd\u7565\u3002',
    customTitle: '\u81ea\u5b9a\u4e49\u8def\u5f84',
    customHelp: '\u81ea\u5b9a\u4e49\u8def\u5f84\u4f1a\u76f4\u63a5\u663e\u793a\u5728\u67e5\u770b\u9875\uff0c\u4e0d\u9700\u8981\u7b49\u5f85 Agent \u4e8b\u4ef6\u6355\u83b7\u3002',
    customPlaceholder: '\u4f8b\u5982 output/main.md',
    customListLabel: '\u81ea\u5b9a\u4e49\u8def\u5f84\u5217\u8868',
    add: '\u6dfb\u52a0',
    remove: '\u79fb\u9664',
    resize: '\u8c03\u6574\u9762\u677f\u5927\u5c0f',
    noRun: '\u5f53\u524d\u6ca1\u6709 Agent \u8fd0\u884c\u3002\u5f00\u542f Agent \u6a21\u5f0f\u5e76\u8fd0\u884c\u4e00\u6b21\u540e\u53ef\u67e5\u770b\u5de5\u4f5c\u533a\u3002',
    noFiles: '\u6240\u9009\u76ee\u5f55\u548c\u81ea\u5b9a\u4e49\u8def\u5f84\u4e0b\u8fd8\u6ca1\u6709\u53ef\u663e\u793a\u7684\u6587\u6863\u3002',
    clickFile: '\u70b9\u51fb\u5de6\u4fa7\u6587\u4ef6\u67e5\u770b\u5185\u5bb9\u3002',
    running: '\u8fd0\u884c\u4e2d',
    lastRun: '\u4e0a\u6b21\u8fd0\u884c',
    readingEvents: '\u6b63\u5728\u8bfb\u53d6\u4e8b\u4ef6...',
    loadingFile: '\u6b63\u5728\u8bfb\u53d6\u6587\u4ef6...',
    customGroup: '\u81ea\u5b9a\u4e49\u8def\u5f84',
    invalidPath: '\u8bf7\u8f93\u5165\u6587\u4ef6\u8def\u5f84\u3002',
    duplicatePath: '\u8be5\u8def\u5f84\u5df2\u5728\u5217\u8868\u4e2d\u3002',
});

const WORKSPACE_ROOTS = Object.freeze([
    {
        id: 'output',
        label: 'output/',
        description: '\u6700\u7ec8\u8f93\u51fa\u3002\u9ed8\u8ba4\u6d88\u606f\u6b63\u6587\u662f output/main.md\u3002',
    },
    {
        id: 'scratch',
        label: 'scratch/',
        description: '\u4e34\u65f6\u7b14\u8bb0\u3001\u8349\u7a3f\u3001\u6574\u7406\u8fc7\u7a0b\u3002',
    },
    {
        id: 'plan',
        label: 'plan/',
        description: '\u89c4\u5212\u6587\u4ef6\u3002\u5f53\u524d Plan Mode \u5c1a\u672a\u4f5c\u4e3a\u5b8c\u6574\u8fd0\u884c\u65f6\u5f00\u653e\u3002',
    },
    {
        id: 'summaries',
        label: 'summaries/',
        description: '\u6458\u8981\u3001\u9636\u6bb5\u603b\u7ed3\u3001\u53ef\u590d\u7528\u6982\u62ec\u3002',
    },
    {
        id: 'persist',
        label: 'persist/',
        description: '\u540c\u4e00\u804a\u5929\u540e\u7eed\u8fd0\u884c\u53ef\u7ee7\u7eed\u4f7f\u7528\u7684\u6301\u4e45\u4fe1\u606f\u3002',
    },
]);
const WORKSPACE_ROOT_IDS = new Set(WORKSPACE_ROOTS.map((root) => root.id));

const DEFAULT_SETTINGS = Object.freeze({
    fontSize: 14,
    visibleRoots: ['output', 'scratch', 'plan', 'summaries', 'persist'],
    collapsedRoots: [],
    customPaths: [],
    selectedCustomPath: '',
    bubble: { left: null, top: null },
    panel: { left: null, top: null, width: null, height: null },
});

const state = {
    settings: { ...DEFAULT_SETTINGS },
    agentModeEnabled: false,
    activeRunId: '',
    currentRun: null,
    events: [],
    discoveredPaths: [],
    selectedPath: '',
    selectedFile: null,
    loadingList: false,
    loadingFile: false,
    error: '',
    activeTab: 'workspace',
    open: false,
    unsubscribers: [],
};

let root = null;
let bubble = null;
let panel = null;
let fileList = null;
let fileView = null;
let titleRun = null;
let statusLine = null;
let fontInput = null;
let customPathInput = null;
let customPathSelect = null;
let tabs = [];
let tabPanels = [];

function host() {
    return window.__TAURITAVERN__;
}

function waitForDocumentBody() {
    if (document.body) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
}

function extensionStore() {
    const store = host()?.api?.extension?.store;
    if (!store) {
        throw new Error('TauriTavern extension store API is unavailable.');
    }
    return store;
}

function agentApi() {
    const api = host()?.api?.agent;
    if (!api) {
        throw new Error('TauriTavern Agent API is unavailable.');
    }
    return api;
}

function normalizeWorkspacePath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/+$/g, '');
}

function sanitizeRootList(value, fallback) {
    if (!Array.isArray(value)) {
        return fallback;
    }
    return value.map((item) => String(item || '').trim()).filter((item) => WORKSPACE_ROOT_IDS.has(item));
}

function sanitizePathList(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const seen = new Set();
    const output = [];
    for (const item of value) {
        const path = normalizeWorkspacePath(item);
        if (!path || path.includes(':chars=') || seen.has(path)) {
            continue;
        }
        seen.add(path);
        output.push(path);
    }
    return output;
}

function cloneSettings(value) {
    const customPaths = sanitizePathList(value?.customPaths);
    const selectedCustomPath = normalizeWorkspacePath(value?.selectedCustomPath);
    return {
        ...DEFAULT_SETTINGS,
        ...(value || {}),
        visibleRoots: sanitizeRootList(value?.visibleRoots, DEFAULT_SETTINGS.visibleRoots),
        collapsedRoots: sanitizeRootList(value?.collapsedRoots, DEFAULT_SETTINGS.collapsedRoots),
        customPaths,
        selectedCustomPath: customPaths.includes(selectedCustomPath) ? selectedCustomPath : '',
        bubble: { ...DEFAULT_SETTINGS.bubble, ...(value?.bubble || {}) },
        panel: { ...DEFAULT_SETTINGS.panel, ...(value?.panel || {}) },
    };
}

async function loadSettings() {
    const result = await extensionStore().tryGetJson({
        namespace: MODULE_NAME,
        key: SETTINGS_KEY,
    });
    state.settings = cloneSettings(result?.found ? result.value : DEFAULT_SETTINGS);
}

async function saveSettings(patch = {}) {
    state.settings = cloneSettings({
        ...state.settings,
        ...patch,
    });
    await extensionStore().setJson({
        namespace: MODULE_NAME,
        key: SETTINGS_KEY,
        value: state.settings,
    });
}

async function loadAgentModeSetting() {
    try {
        const result = await extensionStore().tryGetJson({
            namespace: AGENT_SYSTEM_MODULE_NAME,
            key: AGENT_SYSTEM_SETTINGS_KEY,
        });
        const settings = result?.found ? result.value : DEFAULT_AGENT_SYSTEM_SETTINGS;
        state.agentModeEnabled = Boolean(settings?.agentModeEnabled);
    } catch (error) {
        console.warn('[AgentWorkspaceFloat] Failed to read Agent System settings:', error);
        state.agentModeEnabled = false;
    }
}

function subscribeAgentModeSetting() {
    const handler = (event) => {
        state.agentModeEnabled = Boolean(event?.detail?.settings?.agentModeEnabled);
        render();
    };
    window.addEventListener(AGENT_SYSTEM_SETTINGS_CHANGED, handler);
    state.unsubscribers.push(() => window.removeEventListener(AGENT_SYSTEM_SETTINGS_CHANGED, handler));
}

function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) {
        el.className = options.className;
    }
    if (options.text != null) {
        el.textContent = options.text;
    }
    if (options.attrs) {
        for (const [key, value] of Object.entries(options.attrs)) {
            el.setAttribute(key, String(value));
        }
    }
    return el;
}

function mountDom() {
    if (document.getElementById('ttaw-root')) {
        return;
    }

    root = createElement('div', { className: 'ttaw-root', attrs: { id: 'ttaw-root' } });
    bubble = createElement('button', {
        className: 'ttaw-bubble',
        attrs: {
            type: 'button',
            title: TEXT.title,
            'aria-label': TEXT.title,
        },
    });
    bubble.innerHTML = '<i class="fa-solid fa-folder-open" aria-hidden="true"></i>';
    applySurface(bubble, SURFACE.FreeWindow);

    panel = createElement('section', {
        className: 'ttaw-panel',
        attrs: {
            role: 'dialog',
            'aria-label': TEXT.title,
        },
    });
    applySurface(panel, SURFACE.FreeWindow);

    panel.innerHTML = `
        <header class="ttaw-panel-head" data-ttaw-drag-handle>
            <div>
                <strong>${TEXT.title}</strong>
                <small data-ttaw-run>${TEXT.waitingRun}</small>
            </div>
            <button class="ttaw-icon-button" type="button" data-ttaw-close title="Close" aria-label="Close">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
        </header>
        <nav class="ttaw-tabs" aria-label="Agent workspace tabs">
            <button type="button" data-ttaw-tab="workspace">${TEXT.workspaceTab}</button>
            <button type="button" data-ttaw-tab="settings">${TEXT.settingsTab}</button>
        </nav>
        <div class="ttaw-tab-panel" data-ttaw-panel="workspace">
            <div class="ttaw-toolbar">
                <button type="button" class="menu_button menu_button_icon" data-ttaw-refresh>
                    <i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
                    <span>${TEXT.refresh}</span>
                </button>
                <span data-ttaw-status></span>
            </div>
            <div class="ttaw-workspace-grid">
                <aside class="ttaw-file-list" data-ttaw-file-list></aside>
                <article class="ttaw-file-view">
                    <div class="ttaw-file-title" data-ttaw-file-title>${TEXT.selectFile}</div>
                    <pre data-ttaw-file-view></pre>
                </article>
            </div>
        </div>
        <div class="ttaw-tab-panel" data-ttaw-panel="settings">
            <label class="ttaw-setting-row">
                <span>${TEXT.fontSize}</span>
                <input type="number" min="11" max="24" step="1" data-ttaw-font-size>
            </label>
            <section class="ttaw-root-filter">
                <h4>${TEXT.rootsTitle}</h4>
                <p>${TEXT.rootsHelp}</p>
                <div class="ttaw-root-options" data-ttaw-root-options></div>
            </section>
            <section class="ttaw-custom-paths">
                <h4>${TEXT.customTitle}</h4>
                <p>${TEXT.customHelp}</p>
                <div class="ttaw-custom-path-form">
                    <input type="text" data-ttaw-custom-path-input placeholder="${TEXT.customPlaceholder}">
                    <button type="button" class="menu_button menu_button_icon" data-ttaw-custom-path-add>
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        <span>${TEXT.add}</span>
                    </button>
                </div>
                <select size="5" data-ttaw-custom-path-list aria-label="${TEXT.customListLabel}"></select>
                <button type="button" class="menu_button menu_button_icon" data-ttaw-custom-path-remove>
                    <i class="fa-solid fa-minus" aria-hidden="true"></i>
                    <span>${TEXT.remove}</span>
                </button>
            </section>
        </div>
        <button class="ttaw-resize-handle" type="button" data-ttaw-resize title="${TEXT.resize}" aria-label="${TEXT.resize}"></button>
    `;

    root.append(bubble, panel);
    document.body.appendChild(root);

    titleRun = panel.querySelector('[data-ttaw-run]');
    statusLine = panel.querySelector('[data-ttaw-status]');
    fileList = panel.querySelector('[data-ttaw-file-list]');
    fileView = panel.querySelector('[data-ttaw-file-view]');
    fontInput = panel.querySelector('[data-ttaw-font-size]');
    customPathInput = panel.querySelector('[data-ttaw-custom-path-input]');
    customPathSelect = panel.querySelector('[data-ttaw-custom-path-list]');
    tabs = Array.from(panel.querySelectorAll('[data-ttaw-tab]'));
    tabPanels = Array.from(panel.querySelectorAll('[data-ttaw-panel]'));

    bubble.addEventListener('click', (event) => {
        if (bubble.dataset.dragged === '1') {
            event.preventDefault();
            bubble.dataset.dragged = '0';
            return;
        }
        state.open = !state.open;
        render();
        if (state.open) {
            void refreshWorkspace();
        }
    });

    const closeButton = panel.querySelector('[data-ttaw-close]');
    closeButton?.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
    });
    closeButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        state.open = false;
        render();
    });
    panel.querySelector('[data-ttaw-refresh]')?.addEventListener('click', () => void refreshWorkspace());
    fontInput.addEventListener('input', () => void updateFontSize(Number(fontInput.value)));
    panel.querySelector('[data-ttaw-custom-path-add]')?.addEventListener('click', () => void addCustomPath());
    panel.querySelector('[data-ttaw-custom-path-remove]')?.addEventListener('click', () => void removeSelectedCustomPath());
    customPathInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void addCustomPath();
        }
    });
    customPathSelect?.addEventListener('change', () => void selectCustomPath());
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            state.activeTab = tab.dataset.ttawTab || 'workspace';
            render();
        });
    });

    installDrag(bubble, bubble, 'bubble');
    installDrag(panel, panel.querySelector('[data-ttaw-drag-handle]'), 'panel');
    installResize(panel, panel.querySelector('[data-ttaw-resize]'));
    applySavedPanelBounds();
}

function renderRootOptions() {
    const container = panel?.querySelector('[data-ttaw-root-options]');
    if (!(container instanceof HTMLElement)) {
        return;
    }
    container.replaceChildren();
    const visibleRoots = new Set(state.settings.visibleRoots);
    for (const workspaceRoot of WORKSPACE_ROOTS) {
        const label = createElement('label', { className: 'ttaw-root-option' });
        label.innerHTML = `
            <input type="checkbox" value="">
            <span>
                <strong></strong>
                <small></small>
            </span>
        `;
        const input = label.querySelector('input');
        input.value = workspaceRoot.id;
        input.checked = visibleRoots.has(workspaceRoot.id);
        input.addEventListener('change', () => void updateVisibleRoots());
        label.querySelector('strong').textContent = workspaceRoot.label;
        label.querySelector('small').textContent = workspaceRoot.description;
        container.append(label);
    }
}

function renderCustomPathList() {
    if (!(customPathSelect instanceof HTMLSelectElement)) {
        return;
    }
    customPathSelect.replaceChildren();
    for (const path of state.settings.customPaths) {
        const option = createElement('option', { text: path, attrs: { value: path } });
        option.selected = path === state.settings.selectedCustomPath;
        customPathSelect.append(option);
    }
}

async function updateVisibleRoots() {
    const inputs = Array.from(panel.querySelectorAll('[data-ttaw-root-options] input[type="checkbox"]'));
    const visibleRoots = inputs
        .filter((input) => input.checked)
        .map((input) => String(input.value || '').trim())
        .filter((workspaceRoot) => WORKSPACE_ROOT_IDS.has(workspaceRoot));
    await saveSettings({ visibleRoots });
    updateDiscoveredPaths();
    render();
}

async function selectCustomPath() {
    const selectedCustomPath = normalizeWorkspacePath(customPathSelect?.value);
    await saveSettings({ selectedCustomPath });
    renderCustomPathList();
}

async function addCustomPath() {
    const path = normalizeWorkspacePath(customPathInput?.value);
    if (!path) {
        window.toastr?.warning?.(TEXT.invalidPath);
        return;
    }
    if (state.settings.customPaths.includes(path)) {
        window.toastr?.info?.(TEXT.duplicatePath);
        await saveSettings({ selectedCustomPath: path });
        render();
        return;
    }
    await saveSettings({
        customPaths: [...state.settings.customPaths, path],
        selectedCustomPath: path,
    });
    if (customPathInput) {
        customPathInput.value = '';
    }
    updateDiscoveredPaths();
    render();
}

async function removeSelectedCustomPath() {
    const selected = normalizeWorkspacePath(customPathSelect?.value || state.settings.selectedCustomPath);
    if (!selected) {
        return;
    }
    const customPaths = state.settings.customPaths.filter((path) => path !== selected);
    await saveSettings({
        customPaths,
        selectedCustomPath: customPaths[0] || '',
    });
    if (state.selectedPath === selected) {
        state.selectedPath = '';
        state.selectedFile = null;
    }
    updateDiscoveredPaths();
    render();
}

function applySavedPanelBounds() {
    const bubblePosition = normalizePosition(state.settings.bubble, 24, window.innerHeight * 0.45);
    const panelPosition = normalizePosition(state.settings.panel, window.innerWidth - 444, Math.max(72, window.innerHeight * 0.18));
    setPosition(bubble, bubblePosition);
    setPanelSize(
        Number(state.settings.panel.width) || 440,
        Number(state.settings.panel.height) || 560,
    );
    setPosition(panel, panelPosition);
}

function normalizePosition(position, fallbackLeft, fallbackTop) {
    const left = Number(position?.left);
    const top = Number(position?.top);
    return {
        left: Number.isFinite(left) ? left : fallbackLeft,
        top: Number.isFinite(top) ? top : fallbackTop,
    };
}

function setPosition(el, position) {
    const bounds = clampPosition(position.left, position.top, el);
    el.style.left = `${bounds.left}px`;
    el.style.top = `${bounds.top}px`;
}

function setPanelSize(width, height) {
    const size = clampPanelSize(width, height);
    panel.style.width = `${size.width}px`;
    panel.style.height = `${size.height}px`;
}

function clampPosition(left, top, el) {
    const width = el?.offsetWidth || 64;
    const height = el?.offsetHeight || 64;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    return {
        left: Math.min(Math.max(8, left), maxLeft),
        top: Math.min(Math.max(8, top), maxTop),
    };
}

function clampPanelSize(width, height) {
    return {
        width: Math.min(Math.max(MIN_PANEL_WIDTH, Math.round(width)), Math.max(MIN_PANEL_WIDTH, window.innerWidth - 16)),
        height: Math.min(Math.max(MIN_PANEL_HEIGHT, Math.round(height)), Math.max(MIN_PANEL_HEIGHT, window.innerHeight - 16)),
    };
}

function isInteractiveDragTarget(target) {
    return Boolean(target?.closest?.('button, input, select, textarea, a, label, [data-ttaw-resize]'));
}

function installDrag(target, handle, key) {
    if (!(target instanceof HTMLElement) || !(handle instanceof HTMLElement)) {
        return;
    }

    handle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || (handle !== target && isInteractiveDragTarget(event.target))) {
            return;
        }
        event.preventDefault();
        const rect = target.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = rect.left;
        const startTop = rect.top;
        let moved = false;
        target.setPointerCapture?.(event.pointerId);

        const onMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
                moved = true;
            }
            setPosition(target, { left: startLeft + deltaX, top: startTop + deltaY });
        };
        const onUp = async (upEvent) => {
            target.releasePointerCapture?.(upEvent.pointerId);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            const rectAfter = target.getBoundingClientRect();
            if (key === 'bubble' && moved) {
                bubble.dataset.dragged = '1';
            }
            await saveSettings({
                [key]: {
                    ...state.settings[key],
                    left: Math.round(rectAfter.left),
                    top: Math.round(rectAfter.top),
                },
            });
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp, { once: true });
    });
}

function installResize(target, handle) {
    if (!(target instanceof HTMLElement) || !(handle instanceof HTMLElement)) {
        return;
    }

    handle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const rect = target.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = rect.width;
        const startHeight = rect.height;
        target.classList.add('is-resizing');
        target.setPointerCapture?.(event.pointerId);

        const onMove = (moveEvent) => {
            setPanelSize(startWidth + moveEvent.clientX - startX, startHeight + moveEvent.clientY - startY);
            setPosition(target, { left: target.getBoundingClientRect().left, top: target.getBoundingClientRect().top });
        };
        const onUp = async (upEvent) => {
            target.releasePointerCapture?.(upEvent.pointerId);
            target.classList.remove('is-resizing');
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            const rectAfter = target.getBoundingClientRect();
            await saveSettings({
                panel: {
                    ...state.settings.panel,
                    left: Math.round(rectAfter.left),
                    top: Math.round(rectAfter.top),
                    width: Math.round(rectAfter.width),
                    height: Math.round(rectAfter.height),
                },
            });
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp, { once: true });
    });
}

async function updateFontSize(value) {
    const fontSize = Math.min(Math.max(Number(value) || DEFAULT_SETTINGS.fontSize, 11), 24);
    await saveSettings({ fontSize });
    render();
}

function shortRunId(runId) {
    const value = String(runId || '');
    return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

async function handleRunState(activeRun, lastEvent = null) {
    const nextRun = activeRun || null;
    state.activeRunId = String(nextRun?.runId || '');

    if (nextRun?.runId && nextRun.runId !== state.currentRun?.runId) {
        state.currentRun = nextRun;
        state.events = [];
        state.discoveredPaths = [];
        state.selectedPath = '';
        state.selectedFile = null;
        await refreshWorkspace();
    } else if (!state.currentRun?.runId && lastEvent?.runId) {
        state.currentRun = { runId: String(lastEvent.runId) };
    }
    if (lastEvent) {
        addRunEvent(lastEvent);
    }
    render();
}

function addRunEvent(event) {
    if (!event?.runId || event.runId !== state.currentRun?.runId) {
        return;
    }
    if (state.events.some((item) => String(item.id || '') === String(event.id || '') && Number(item.seq) === Number(event.seq))) {
        return;
    }
    state.events.push(event);
    state.events.sort((left, right) => Number(left.seq || 0) - Number(right.seq || 0));
    updateDiscoveredPaths();
}

async function refreshWorkspace() {
    if (!state.currentRun?.runId) {
        updateDiscoveredPaths();
        render();
        return;
    }
    state.loadingList = true;
    state.error = '';
    render();
    try {
        const result = await agentApi().readEvents({
            runId: state.currentRun.runId,
            beforeSeq: RUN_EVENT_TAIL_SEQ,
            limit: RUN_EVENT_PAGE_LIMIT,
        });
        state.events = Array.isArray(result?.events) ? result.events : [];
        updateDiscoveredPaths();
    } catch (error) {
        state.error = String(error?.message || error);
    } finally {
        state.loadingList = false;
        render();
    }
}

function updateDiscoveredPaths() {
    const paths = new Set();
    for (const event of state.events) {
        const payload = event?.payload || {};
        addEventPath(paths, payload.path);
        addEventPath(paths, payload.resultRef);
        addEventPath(paths, payload.summaryRef);
        addEventPath(paths, payload.argumentsRef);
        if (Array.isArray(payload.resourceRefs)) {
            payload.resourceRefs.forEach((path) => addEventPath(paths, path));
        }
        if (Array.isArray(payload.changes)) {
            payload.changes.forEach((change) => addEventPath(paths, change?.path));
        }
    }
    for (const path of state.settings.customPaths) {
        addCustomPathToSet(paths, path);
    }
    state.discoveredPaths = [...paths].sort((left, right) => left.localeCompare(right));
}

function addEventPath(paths, value) {
    const path = normalizeWorkspacePath(value);
    if (!isUsableFilePath(path) || !isPathUnderEnabledRoot(path)) {
        return;
    }
    paths.add(path);
}

function addCustomPathToSet(paths, value) {
    const path = normalizeWorkspacePath(value);
    if (!isUsableFilePath(path)) {
        return;
    }
    paths.add(path);
}

function isUsableFilePath(path) {
    return Boolean(path) && !path.includes(':chars=') && !path.endsWith('/') && !WORKSPACE_ROOT_IDS.has(path);
}

function rootForPath(path) {
    return normalizeWorkspacePath(path).split('/')[0] || '';
}

function isRootEnabled(workspaceRoot) {
    return state.settings.visibleRoots.includes(workspaceRoot);
}

function isRootCollapsed(workspaceRoot) {
    return state.settings.collapsedRoots.includes(workspaceRoot);
}

function isPathUnderEnabledRoot(path) {
    const workspaceRoot = rootForPath(path);
    return WORKSPACE_ROOT_IDS.has(workspaceRoot) && isRootEnabled(workspaceRoot);
}

async function toggleRootCollapsed(workspaceRoot) {
    const collapsed = new Set(state.settings.collapsedRoots);
    if (collapsed.has(workspaceRoot)) {
        collapsed.delete(workspaceRoot);
    } else {
        collapsed.add(workspaceRoot);
    }
    await saveSettings({ collapsedRoots: [...collapsed] });
    render();
}

async function openWorkspaceFile(path) {
    if (!state.currentRun?.runId) {
        return;
    }
    state.selectedPath = path;
    state.loadingFile = true;
    state.error = '';
    state.selectedFile = null;
    render();
    try {
        state.selectedFile = await agentApi().readWorkspaceFile({
            runId: state.currentRun.runId,
            path,
        });
    } catch (error) {
        state.error = String(error?.message || error);
    } finally {
        state.loadingFile = false;
        render();
    }
}

function groupedDiscoveredPaths() {
    const groups = new Map(WORKSPACE_ROOTS.map((workspaceRoot) => [workspaceRoot.id, []]));
    groups.set(CUSTOM_ROOT_ID, []);
    const customPathSet = new Set(state.settings.customPaths);
    for (const path of state.discoveredPaths) {
        const workspaceRoot = rootForPath(path);
        if (groups.has(workspaceRoot)) {
            groups.get(workspaceRoot).push(path);
        } else {
            groups.get(CUSTOM_ROOT_ID).push(path);
        }
    }
    const rootGroups = WORKSPACE_ROOTS
        .filter((workspaceRoot) => {
            const paths = groups.get(workspaceRoot.id) || [];
            return isRootEnabled(workspaceRoot.id) || paths.some((path) => customPathSet.has(path));
        })
        .map((workspaceRoot) => ({
            ...workspaceRoot,
            paths: groups.get(workspaceRoot.id) || [],
            collapsed: isRootCollapsed(workspaceRoot.id),
        }));
    const customPaths = groups.get(CUSTOM_ROOT_ID) || [];
    if (customPaths.length > 0) {
        rootGroups.push({
            id: CUSTOM_ROOT_ID,
            label: TEXT.customGroup,
            paths: customPaths,
            collapsed: false,
        });
    }
    return rootGroups;
}

function renderFileList() {
    fileList.replaceChildren();
    if (!state.currentRun?.runId) {
        fileList.append(createElement('div', {
            className: 'ttaw-empty',
            text: TEXT.noRun,
        }));
        return;
    }
    const groups = groupedDiscoveredPaths().filter((group) => group.paths.length > 0);
    if (groups.length === 0) {
        fileList.append(createElement('div', {
            className: 'ttaw-empty',
            text: TEXT.noFiles,
        }));
        return;
    }
    for (const group of groups) {
        const section = createElement('section', { className: 'ttaw-file-group' });
        const header = createElement('button', {
            className: 'ttaw-file-group-head',
            attrs: {
                type: 'button',
                'aria-expanded': String(!group.collapsed),
            },
        });
        header.innerHTML = `
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            <strong></strong>
            <small></small>
        `;
        header.querySelector('strong').textContent = group.label;
        header.querySelector('small').textContent = String(group.paths.length);
        if (group.id !== CUSTOM_ROOT_ID) {
            header.addEventListener('click', () => void toggleRootCollapsed(group.id));
        }
        section.append(header);

        if (!group.collapsed) {
            const body = createElement('div', { className: 'ttaw-file-group-body' });
            for (const path of group.paths) {
                const button = createElement('button', {
                    className: `ttaw-file-item${path === state.selectedPath ? ' is-active' : ''}`,
                    attrs: { type: 'button', title: path },
                });
                button.innerHTML = `<i class="fa-solid fa-file-lines" aria-hidden="true"></i><span></span>`;
                button.querySelector('span').textContent = group.id === CUSTOM_ROOT_ID
                    ? path
                    : (path.slice(group.id.length + 1) || path);
                button.addEventListener('click', () => void openWorkspaceFile(path));
                body.append(button);
            }
            section.append(body);
        }
        fileList.append(section);
    }
}

function renderFileView() {
    const title = panel.querySelector('[data-ttaw-file-title]');
    title.textContent = state.selectedPath || TEXT.selectFile;
    fileView.style.fontSize = `${state.settings.fontSize}px`;
    if (state.loadingFile) {
        fileView.textContent = TEXT.loadingFile;
        return;
    }
    if (state.selectedFile) {
        fileView.textContent = state.selectedFile.text || '';
        return;
    }
    fileView.textContent = state.error || TEXT.clickFile;
}

function render() {
    if (!root) {
        return;
    }
    const visible = Boolean(state.agentModeEnabled);
    root.hidden = !visible;
    bubble.hidden = !visible;
    panel.hidden = !visible || !state.open;

    if (titleRun) {
        const isActiveRun = state.currentRun?.runId && state.currentRun.runId === state.activeRunId;
        titleRun.textContent = state.currentRun?.runId
            ? `${isActiveRun ? TEXT.running : TEXT.lastRun} ${shortRunId(state.currentRun.runId)}`
            : TEXT.waitingRun;
    }
    if (statusLine) {
        const parts = [];
        if (state.loadingList) {
            parts.push(TEXT.readingEvents);
        }
        if (state.currentRun?.runId) {
            parts.push(`${state.discoveredPaths.length} files`);
        }
        if (state.error) {
            parts.push(state.error);
        }
        statusLine.textContent = parts.join(' | ');
    }
    if (fontInput) {
        fontInput.value = String(state.settings.fontSize);
    }
    renderRootOptions();
    renderCustomPathList();

    tabs.forEach((tab) => {
        const active = tab.dataset.ttawTab === state.activeTab;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
    });
    tabPanels.forEach((tabPanel) => {
        tabPanel.hidden = tabPanel.dataset.ttawPanel !== state.activeTab;
    });

    renderFileList();
    renderFileView();
}

async function init() {
    await waitForHostReady();
    await waitForDocumentBody();
    if (!host()?.api?.agent || !host()?.api?.extension?.store) {
        console.warn('[AgentWorkspaceFloat] Required TauriTavern host APIs are unavailable.');
        return;
    }
    await loadSettings();
    await loadAgentModeSetting();
    mountDom();
    subscribeAgentModeSetting();
    state.unsubscribers.push(subscribeAgentRunState((runState) => {
        void handleRunState(runState?.activeRun, runState?.lastEvent);
    }));
    state.unsubscribers.push(subscribeAgentRunEvents((event) => {
        addRunEvent(event);
        render();
    }));
    await handleRunState(getActiveAgentRun(), null);
    render();
}

void init().catch((error) => {
    console.error('[AgentWorkspaceFloat] Failed to initialize:', error);
    window.toastr?.error?.(String(error?.message || error));
});
