import {
    waitForHostReady,
    SURFACE,
    applySurface,
} from '/scripts/tauritavern/layout-kit.js';
import {
    getActiveAgentRun,
    subscribeAgentRunEvents,
    subscribeAgentRunState,
} from '/scripts/tauritavern/agent/agent-run-controller.js';
import {
    subscribeAgentProfilesChanged,
} from '/scripts/tauritavern/agent/agent-profile-events.js';
import {
    getContext,
} from '/scripts/extensions.js';
import {
    deleteLastMessage,
    markWindowedChatDirtyFromIndex,
    sendTextareaMessage,
} from '/script.js';

const MODULE_NAME = 'agent-workspace-float';
const SETTINGS_KEY = 'settings';
const RUN_EVENT_TAIL_SEQ = Number.MAX_SAFE_INTEGER;
const RUN_EVENT_PAGE_LIMIT = 240;
const MIN_PANEL_WIDTH = 360;
const MIN_PANEL_HEIGHT = 360;
const CUSTOM_ROOT_ID = '__custom__';
const BUBBLE_CLICK_DELAY_MS = 240;
const PRE_AGENT_INTERCEPTOR_KEY = 'agentWorkspaceFloatPreAgentInterceptor';
const TERMINAL_RUN_EVENTS = new Set(['run_completed', 'run_partial_success', 'run_cancelled', 'run_failed']);
const TERMINAL_INVOCATION_EVENTS = new Set([
    'agent_invocation_completed',
    'agent_invocation_failed',
    'agent_invocation_cancelled',
    'agent_invocation_transferred',
]);

const TEXT = Object.freeze({
    title: 'Agent \u5de5\u4f5c\u533a',
    waitingRun: '\u7b49\u5f85 Agent \u8fd0\u884c',
    workspaceTab: '\u5de5\u4f5c\u533a\u67e5\u770b',
    preAgentTab: '\u524d\u7f6e Agent',
    statusTab: '\u540e\u7f6e Agent',
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
    close: '\u5173\u95ed',
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
    outputDocumentsTitle: '\u8f93\u51fa\u6587\u6863\u8bbe\u7f6e',
    outputDocumentsHelp: '\u4e3a Agent Profile \u914d\u7f6e\u5bf9\u5e94\u7684\u8f93\u51fa\u6587\u6863\u8def\u5f84\u3002',
    profileIdPlaceholder: 'Profile ID',
    outputPathPlaceholder: '\u4f8b\u5982 output/main.md',
    outputDocumentsListLabel: '\u8f93\u51fa\u6587\u6863\u6620\u5c04\u5217\u8868',
    outputDocumentRequired: '\u8bf7\u540c\u65f6\u586b\u5199 Profile ID \u548c\u6587\u6863\u8def\u5f84\u3002',
    duplicateOutputDocument: '\u8be5\u8f93\u51fa\u6587\u6863\u6620\u5c04\u5df2\u5728\u5217\u8868\u4e2d\u3002',
    extensionSettingsTitle: 'Agent \u5de5\u4f5c\u533a\u60ac\u6d6e\u67e5\u770b\u5668',
    bubbleEnabled: '\u663e\u793a\u60ac\u6d6e\u7403',
    postAgentSettings: '\u540e\u7f6e Agent \u8bbe\u7f6e',
    postAgentEnabled: '\u542f\u7528',
    postAgentAutomatic: '\u81ea\u52a8',
    preAgentSettings: '\u524d\u7f6e Agent \u8bbe\u7f6e',
    preAgentEnabled: '\u542f\u52a8',
    presentation: '\u8fd0\u884c\u65b9\u5f0f',
    foreground: '\u524d\u53f0',
    background: '\u540e\u53f0',
    agentProfile: 'Agent Profile',
    noProfiles: '\u6ca1\u6709\u53ef\u76f4\u63a5\u8fd0\u884c\u7684 Agent Profile',
    profileRequired: '\u8bf7\u5148\u9009\u62e9 Agent Profile\u3002',
    workflowStarting: '\u6b63\u5728\u542f\u52a8\u540e\u7f6e Agent...',
    workflowStarted: '\u540e\u7f6e Agent \u5df2\u542f\u52a8\u3002',
    preWorkflowStarting: '\u6b63\u5728\u542f\u52a8\u524d\u7f6e Agent...',
    preWorkflowStarted: '\u524d\u7f6e Agent \u5df2\u542f\u52a8\u3002',
    workflowActive: '\u5df2\u6709 Agent \u6b63\u5728\u8fd0\u884c\u3002',
    workflowStatus: '\u72b6\u6001',
    runStatusTitle: '\u8fd0\u884c\u72b6\u6001',
    workflowProfile: '\u5f53\u524d Profile',
    workflowPresentation: '\u8fd0\u884c\u65b9\u5f0f',
    workflowRunId: 'Run ID',
    workflowLastEvent: '\u6700\u8fd1\u4e8b\u4ef6',
    workflowIdle: '\u672a\u8fd0\u884c',
    workflowRunning: '\u8fd0\u884c\u4e2d',
    workflowStopping: '\u6b63\u5728\u505c\u6b62',
    workflowCompleted: '\u5df2\u5b8c\u6210',
    workflowPartialSuccess: '\u90e8\u5206\u6210\u529f',
    workflowCancelled: '\u5df2\u53d6\u6d88',
    workflowFailed: '\u5931\u8d25',
    none: '\u65e0',
    stop: '\u505c\u6b62',
    stopRequested: '\u5df2\u8bf7\u6c42\u505c\u6b62\u540e\u7f6e Agent\u3002',
    preStopRequested: '\u5df2\u8bf7\u6c42\u505c\u6b62\u524d\u7f6e Agent\u3002',
    outputAppendFailed: '\u8f93\u51fa\u6587\u6863\u8ffd\u52a0\u5931\u8d25\u3002',
    preAgentResumeFailed: '\u524d\u7f6e Agent \u5b8c\u6210\uff0c\u4f46\u7528\u6237\u6d88\u606f\u53d1\u9001\u5931\u8d25\u3002',
    preAgentMessageChanged: '\u524d\u7f6e Agent \u8fd0\u884c\u671f\u95f4\u804a\u5929\u5df2\u53d8\u66f4\uff0c\u672a\u81ea\u52a8\u53d1\u9001\u62e6\u622a\u7684\u6d88\u606f\u3002',
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
    bubbleEnabled: true,
    preAgentEnabled: false,
    preAgentPresentation: 'background',
    preAgentProfileId: '',
    preAgentOutputDocuments: [],
    selectedPreAgentOutputDocumentKey: '',
    postAgentEnabled: true,
    postAgentAutomatic: false,
    postAgentPresentation: 'background',
    postAgentProfileId: '',
    fontSize: 14,
    visibleRoots: ['output', 'scratch', 'plan', 'summaries', 'persist'],
    collapsedRoots: [],
    customPaths: [],
    selectedCustomPath: '',
    outputDocuments: [],
    selectedOutputDocumentKey: '',
    bubble: { left: null, top: null },
    panel: { left: null, top: null, width: null, height: null },
});

const state = {
    settings: { ...DEFAULT_SETTINGS },
    agentProfiles: [],
    preAgentStarting: false,
    preAgentStopping: false,
    preAgentIntercepting: false,
    preAgentBypass: false,
    preAgentPhase: 'idle',
    preAgentRunId: '',
    preAgentLastRunId: '',
    preAgentRootProfileId: '',
    preAgentForegroundProfileId: '',
    preAgentProfileId: '',
    preAgentPresentation: '',
    preAgentLastEventType: '',
    preAgentChat: null,
    preAgentOriginalMessage: '',
    preAgentActiveInvocations: new Map(),
    preAgentUnsubscribe: null,
    workflowStarting: false,
    workflowStopping: false,
    workflowPhase: 'idle',
    workflowRunId: '',
    workflowLastRunId: '',
    workflowRootProfileId: '',
    workflowForegroundProfileId: '',
    workflowProfileId: '',
    workflowPresentation: '',
    workflowLastEventType: '',
    workflowActiveInvocations: new Map(),
    workflowOutputHandledInvocations: new Set(),
    workflowOutputQueue: Promise.resolve(),
    workflowUnsubscribe: null,
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
let outputProfileInput = null;
let outputPathInput = null;
let outputDocumentSelect = null;
let preOutputProfileInput = null;
let preOutputPathInput = null;
let preOutputDocumentSelect = null;
let bubbleEnabledInput = null;
let preAgentEnabledInput = null;
let preAgentProfileSelect = null;
let preAgentPresentationInputs = [];
let postAgentEnabledInput = null;
let postAgentAutomaticInput = null;
let postAgentProfileSelect = null;
let postAgentPresentationInputs = [];
let bubbleClickTimer = null;
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

function outputDocumentKey(profileId, path) {
    return JSON.stringify([String(profileId || '').trim(), normalizeWorkspacePath(path)]);
}

function sanitizeOutputDocuments(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const seen = new Set();
    const output = [];
    for (const item of value) {
        const profileId = String(item?.profileId || '').trim();
        const path = normalizeWorkspacePath(item?.path);
        const key = outputDocumentKey(profileId, path);
        if (!profileId || !isUsableFilePath(path) || seen.has(key)) {
            continue;
        }
        seen.add(key);
        output.push({ profileId, path });
    }
    return output;
}

function cloneSettings(value) {
    const customPaths = sanitizePathList(value?.customPaths);
    const selectedCustomPath = normalizeWorkspacePath(value?.selectedCustomPath);
    const outputDocuments = sanitizeOutputDocuments(value?.outputDocuments);
    const selectedOutputDocumentKey = String(value?.selectedOutputDocumentKey || '');
    const preAgentOutputDocuments = sanitizeOutputDocuments(value?.preAgentOutputDocuments);
    const selectedPreAgentOutputDocumentKey = String(value?.selectedPreAgentOutputDocumentKey || '');
    const preAgentPresentation = value?.preAgentPresentation === 'foreground'
        ? 'foreground'
        : 'background';
    const postAgentPresentation = value?.postAgentPresentation === 'foreground'
        ? 'foreground'
        : 'background';
    return {
        ...DEFAULT_SETTINGS,
        ...(value || {}),
        bubbleEnabled: typeof value?.bubbleEnabled === 'boolean'
            ? value.bubbleEnabled
            : DEFAULT_SETTINGS.bubbleEnabled,
        preAgentEnabled: typeof value?.preAgentEnabled === 'boolean'
            ? value.preAgentEnabled
            : DEFAULT_SETTINGS.preAgentEnabled,
        preAgentPresentation,
        preAgentProfileId: String(value?.preAgentProfileId || '').trim(),
        preAgentOutputDocuments,
        selectedPreAgentOutputDocumentKey: preAgentOutputDocuments.some((item) => (
            outputDocumentKey(item.profileId, item.path) === selectedPreAgentOutputDocumentKey
        )) ? selectedPreAgentOutputDocumentKey : '',
        postAgentEnabled: typeof value?.postAgentEnabled === 'boolean'
            ? value.postAgentEnabled
            : DEFAULT_SETTINGS.postAgentEnabled,
        postAgentAutomatic: typeof value?.postAgentAutomatic === 'boolean'
            ? value.postAgentAutomatic
            : DEFAULT_SETTINGS.postAgentAutomatic,
        postAgentPresentation,
        postAgentProfileId: String(value?.postAgentProfileId || '').trim(),
        visibleRoots: sanitizeRootList(value?.visibleRoots, DEFAULT_SETTINGS.visibleRoots),
        collapsedRoots: sanitizeRootList(value?.collapsedRoots, DEFAULT_SETTINGS.collapsedRoots),
        customPaths,
        selectedCustomPath: customPaths.includes(selectedCustomPath) ? selectedCustomPath : '',
        outputDocuments,
        selectedOutputDocumentKey: outputDocuments.some((item) => (
            outputDocumentKey(item.profileId, item.path) === selectedOutputDocumentKey
        )) ? selectedOutputDocumentKey : '',
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

function mountExtensionSettings() {
    const existing = document.getElementById('ttaw-extension-settings');
    if (existing) {
        bubbleEnabledInput = existing.querySelector('[data-ttaw-bubble-enabled]');
        return;
    }

    const container = document.querySelector('#extensions_settings2, #extensions_settings');
    if (!container) {
        console.warn('[AgentWorkspaceFloat] Extension settings container is unavailable.');
        return;
    }

    const settingsRoot = createElement('div', {
        className: 'extension_container',
        attrs: { id: 'ttaw-extension-settings' },
    });
    settingsRoot.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>${TEXT.extensionSettingsTitle}</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label" for="ttaw-bubble-enabled">
                    <input id="ttaw-bubble-enabled" type="checkbox" data-ttaw-bubble-enabled>
                    <span>${TEXT.bubbleEnabled}</span>
                </label>
            </div>
        </div>
    `;
    container.append(settingsRoot);

    bubbleEnabledInput = settingsRoot.querySelector('[data-ttaw-bubble-enabled]');
    bubbleEnabledInput?.addEventListener('input', () => void updateBubbleEnabled(bubbleEnabledInput.checked));
}

async function updateBubbleEnabled(enabled) {
    if (!enabled) {
        state.open = false;
    }
    await saveSettings({ bubbleEnabled: Boolean(enabled) });
    render();
}

async function refreshAgentProfiles() {
    try {
        const result = await agentApi().profiles.list();
        state.agentProfiles = (Array.isArray(result?.profiles) ? result.profiles : [])
            .filter((profile) => String(profile?.id || '').trim())
            .sort((left, right) => String(left.displayName || left.id).localeCompare(String(right.displayName || right.id)));

        const selectedExists = directRunnableAgentProfiles()
            .some((profile) => profile.id === state.settings.postAgentProfileId);
        const preSelectedExists = directRunnableAgentProfiles()
            .some((profile) => profile.id === state.settings.preAgentProfileId);
        if (!selectedExists || !preSelectedExists) {
            const fallbackProfileId = directRunnableAgentProfiles()[0]?.id || '';
            await saveSettings({
                ...(!selectedExists ? { postAgentProfileId: fallbackProfileId } : {}),
                ...(!preSelectedExists ? { preAgentProfileId: fallbackProfileId } : {}),
            });
        }
    } catch (error) {
        state.agentProfiles = [];
        console.warn('[AgentWorkspaceFloat] Failed to list Agent Profiles:', error);
    }
    renderAgentProfileOptions();
}

function directRunnableAgentProfiles() {
    return state.agentProfiles.filter((profile) => profile?.directRunnable !== false);
}

function renderAgentProfileOptions() {
    populateAgentProfileSelect(postAgentProfileSelect, state.settings.postAgentProfileId);
    populateAgentProfileSelect(preAgentProfileSelect, state.settings.preAgentProfileId);
}

function populateAgentProfileSelect(select, selectedProfileId) {
    if (!(select instanceof HTMLSelectElement)) {
        return;
    }
    select.replaceChildren();
    const profiles = directRunnableAgentProfiles();
    if (profiles.length === 0) {
        const option = createElement('option', {
            text: TEXT.noProfiles,
            attrs: { value: '', disabled: 'disabled' },
        });
        option.selected = true;
        select.append(option);
        select.disabled = true;
        return;
    }

    select.disabled = false;
    for (const profile of profiles) {
        const label = String(profile.displayName || profile.id);
        const option = createElement('option', {
            text: label === profile.id ? label : `${label} (${profile.id})`,
            attrs: { value: profile.id },
        });
        option.selected = profile.id === selectedProfileId;
        select.append(option);
    }
}

function syncExtensionSettings() {
    if (bubbleEnabledInput) {
        bubbleEnabledInput.checked = Boolean(state.settings.bubbleEnabled);
    }
    if (postAgentEnabledInput) {
        postAgentEnabledInput.checked = Boolean(state.settings.postAgentEnabled);
    }
    if (postAgentAutomaticInput) {
        postAgentAutomaticInput.checked = Boolean(state.settings.postAgentAutomatic);
    }
    postAgentPresentationInputs.forEach((input) => {
        input.checked = input.value === state.settings.postAgentPresentation;
    });
    if (postAgentProfileSelect && postAgentProfileSelect.value !== state.settings.postAgentProfileId) {
        postAgentProfileSelect.value = state.settings.postAgentProfileId;
    }
    if (preAgentEnabledInput) {
        preAgentEnabledInput.checked = Boolean(state.settings.preAgentEnabled);
    }
    preAgentPresentationInputs.forEach((input) => {
        input.checked = input.value === state.settings.preAgentPresentation;
    });
    if (preAgentProfileSelect && preAgentProfileSelect.value !== state.settings.preAgentProfileId) {
        preAgentProfileSelect.value = state.settings.preAgentProfileId;
    }
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
            <button class="ttaw-icon-button" type="button" data-ttaw-close title="${TEXT.close}" aria-label="${TEXT.close}">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
        </header>
        <nav class="ttaw-tabs" aria-label="Agent workspace tabs">
            <button type="button" data-ttaw-tab="workspace">${TEXT.workspaceTab}</button>
            <button type="button" data-ttaw-tab="pre-agent">${TEXT.preAgentTab}</button>
            <button type="button" data-ttaw-tab="status">${TEXT.statusTab}</button>
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
        <div class="ttaw-tab-panel" data-ttaw-panel="pre-agent">
            <section class="ttaw-run-status">
                <h4>${TEXT.runStatusTitle}</h4>
                <dl>
                    <div>
                        <dt>${TEXT.workflowStatus}</dt>
                        <dd data-ttaw-pre-workflow-status>${TEXT.workflowIdle}</dd>
                    </div>
                    <div>
                        <dt>${TEXT.workflowProfile}</dt>
                        <dd data-ttaw-pre-workflow-profile>${TEXT.none}</dd>
                    </div>
                    <div>
                        <dt>${TEXT.workflowPresentation}</dt>
                        <dd data-ttaw-pre-workflow-presentation>${TEXT.none}</dd>
                    </div>
                    <div>
                        <dt>${TEXT.workflowRunId}</dt>
                        <dd data-ttaw-pre-workflow-run-id>${TEXT.none}</dd>
                    </div>
                    <div>
                        <dt>${TEXT.workflowLastEvent}</dt>
                        <dd data-ttaw-pre-workflow-last-event>${TEXT.none}</dd>
                    </div>
                </dl>
                <button type="button" class="menu_button menu_button_icon ttaw-stop-button" data-ttaw-stop-pre-workflow disabled>
                    <i class="fa-solid fa-circle-stop" aria-hidden="true"></i>
                    <span>${TEXT.stop}</span>
                </button>
            </section>
            <section class="ttaw-post-agent-settings">
                <h4>${TEXT.preAgentSettings}</h4>
                <div class="ttaw-post-agent-flags ttaw-pre-agent-flags">
                    <label class="checkbox_label">
                        <input type="checkbox" data-ttaw-pre-agent-enabled>
                        <span>${TEXT.preAgentEnabled}</span>
                    </label>
                </div>
                <div class="ttaw-extension-field">
                    <span>${TEXT.presentation}</span>
                    <div class="ttaw-presentation-options">
                        <label>
                            <input type="radio" name="ttaw-pre-agent-presentation" value="foreground" data-ttaw-pre-agent-presentation>
                            <span>${TEXT.foreground}</span>
                        </label>
                        <label>
                            <input type="radio" name="ttaw-pre-agent-presentation" value="background" data-ttaw-pre-agent-presentation>
                            <span>${TEXT.background}</span>
                        </label>
                    </div>
                </div>
                <label class="ttaw-extension-field" for="ttaw-pre-agent-profile">
                    <span>${TEXT.agentProfile}</span>
                    <select id="ttaw-pre-agent-profile" class="text_pole" data-ttaw-pre-agent-profile></select>
                </label>
                <section class="ttaw-output-documents">
                    <h4>${TEXT.outputDocumentsTitle}</h4>
                    <p>${TEXT.outputDocumentsHelp}</p>
                    <div class="ttaw-output-document-form">
                        <input type="text" data-ttaw-pre-output-profile placeholder="${TEXT.profileIdPlaceholder}">
                        <input type="text" data-ttaw-pre-output-path placeholder="${TEXT.outputPathPlaceholder}">
                        <button type="button" class="menu_button menu_button_icon" data-ttaw-pre-output-add>
                            <i class="fa-solid fa-plus" aria-hidden="true"></i>
                            <span>${TEXT.add}</span>
                        </button>
                    </div>
                    <select size="5" data-ttaw-pre-output-list aria-label="${TEXT.outputDocumentsListLabel}"></select>
                    <button type="button" class="menu_button menu_button_icon" data-ttaw-pre-output-remove>
                        <i class="fa-solid fa-minus" aria-hidden="true"></i>
                        <span>${TEXT.remove}</span>
                    </button>
                </section>
            </section>
        </div>
        <div class="ttaw-tab-panel" data-ttaw-panel="status">
            <section class="ttaw-run-status">
                <h4>${TEXT.runStatusTitle}</h4>
                <dl>
                    <div>
                        <dt>${TEXT.workflowStatus}</dt>
                        <dd data-ttaw-workflow-status>${TEXT.workflowIdle}</dd>
                    </div>
                    <div>
                        <dt>${TEXT.workflowProfile}</dt>
                        <dd data-ttaw-workflow-profile>${TEXT.none}</dd>
                    </div>
                    <div>
                        <dt>${TEXT.workflowPresentation}</dt>
                        <dd data-ttaw-workflow-presentation>${TEXT.none}</dd>
                    </div>
                    <div>
                        <dt>${TEXT.workflowRunId}</dt>
                        <dd data-ttaw-workflow-run-id>${TEXT.none}</dd>
                    </div>
                    <div>
                        <dt>${TEXT.workflowLastEvent}</dt>
                        <dd data-ttaw-workflow-last-event>${TEXT.none}</dd>
                    </div>
                </dl>
                <button type="button" class="menu_button menu_button_icon ttaw-stop-button" data-ttaw-stop-workflow disabled>
                    <i class="fa-solid fa-circle-stop" aria-hidden="true"></i>
                    <span>${TEXT.stop}</span>
                </button>
            </section>
            <section class="ttaw-post-agent-settings">
                <h4>${TEXT.postAgentSettings}</h4>
                <div class="ttaw-post-agent-flags">
                    <label class="checkbox_label">
                        <input type="checkbox" data-ttaw-post-agent-enabled>
                        <span>${TEXT.postAgentEnabled}</span>
                    </label>
                    <label class="checkbox_label">
                        <input type="checkbox" data-ttaw-post-agent-automatic>
                        <span>${TEXT.postAgentAutomatic}</span>
                    </label>
                </div>
                <div class="ttaw-extension-field">
                    <span>${TEXT.presentation}</span>
                    <div class="ttaw-presentation-options">
                        <label>
                            <input type="radio" name="ttaw-post-agent-presentation" value="foreground" data-ttaw-post-agent-presentation>
                            <span>${TEXT.foreground}</span>
                        </label>
                        <label>
                            <input type="radio" name="ttaw-post-agent-presentation" value="background" data-ttaw-post-agent-presentation>
                            <span>${TEXT.background}</span>
                        </label>
                    </div>
                </div>
                <label class="ttaw-extension-field" for="ttaw-post-agent-profile">
                    <span>${TEXT.agentProfile}</span>
                    <select id="ttaw-post-agent-profile" class="text_pole" data-ttaw-post-agent-profile></select>
                </label>
                <section class="ttaw-output-documents">
                    <h4>${TEXT.outputDocumentsTitle}</h4>
                    <p>${TEXT.outputDocumentsHelp}</p>
                    <div class="ttaw-output-document-form">
                        <input type="text" data-ttaw-output-profile placeholder="${TEXT.profileIdPlaceholder}">
                        <input type="text" data-ttaw-output-path placeholder="${TEXT.outputPathPlaceholder}">
                        <button type="button" class="menu_button menu_button_icon" data-ttaw-output-add>
                            <i class="fa-solid fa-plus" aria-hidden="true"></i>
                            <span>${TEXT.add}</span>
                        </button>
                    </div>
                    <select size="5" data-ttaw-output-list aria-label="${TEXT.outputDocumentsListLabel}"></select>
                    <button type="button" class="menu_button menu_button_icon" data-ttaw-output-remove>
                        <i class="fa-solid fa-minus" aria-hidden="true"></i>
                        <span>${TEXT.remove}</span>
                    </button>
                </section>
            </section>
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
    outputProfileInput = panel.querySelector('[data-ttaw-output-profile]');
    outputPathInput = panel.querySelector('[data-ttaw-output-path]');
    outputDocumentSelect = panel.querySelector('[data-ttaw-output-list]');
    preOutputProfileInput = panel.querySelector('[data-ttaw-pre-output-profile]');
    preOutputPathInput = panel.querySelector('[data-ttaw-pre-output-path]');
    preOutputDocumentSelect = panel.querySelector('[data-ttaw-pre-output-list]');
    preAgentEnabledInput = panel.querySelector('[data-ttaw-pre-agent-enabled]');
    preAgentProfileSelect = panel.querySelector('[data-ttaw-pre-agent-profile]');
    preAgentPresentationInputs = Array.from(panel.querySelectorAll('[data-ttaw-pre-agent-presentation]'));
    postAgentEnabledInput = panel.querySelector('[data-ttaw-post-agent-enabled]');
    postAgentAutomaticInput = panel.querySelector('[data-ttaw-post-agent-automatic]');
    postAgentProfileSelect = panel.querySelector('[data-ttaw-post-agent-profile]');
    postAgentPresentationInputs = Array.from(panel.querySelectorAll('[data-ttaw-post-agent-presentation]'));
    tabs = Array.from(panel.querySelectorAll('[data-ttaw-tab]'));
    tabPanels = Array.from(panel.querySelectorAll('[data-ttaw-panel]'));

    bubble.addEventListener('click', (event) => {
        if (bubble.dataset.dragged === '1') {
            event.preventDefault();
            bubble.dataset.dragged = '0';
            clearTimeout(bubbleClickTimer);
            bubbleClickTimer = null;
            return;
        }
        clearTimeout(bubbleClickTimer);
        bubbleClickTimer = setTimeout(() => {
            bubbleClickTimer = null;
            state.open = !state.open;
            render();
            if (state.open) {
                void refreshWorkspace();
            }
        }, BUBBLE_CLICK_DELAY_MS);
    });
    bubble.addEventListener('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearTimeout(bubbleClickTimer);
        bubbleClickTimer = null;
        if (bubble.dataset.dragged === '1') {
            bubble.dataset.dragged = '0';
            return;
        }
        void startPostAgentWorkflow();
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
    panel.querySelector('[data-ttaw-stop-workflow]')?.addEventListener('click', () => void stopPostAgentWorkflow());
    panel.querySelector('[data-ttaw-stop-pre-workflow]')?.addEventListener('click', () => void stopPreAgentWorkflow());
    fontInput.addEventListener('input', () => void updateFontSize(Number(fontInput.value)));
    panel.querySelector('[data-ttaw-custom-path-add]')?.addEventListener('click', () => void addCustomPath());
    panel.querySelector('[data-ttaw-custom-path-remove]')?.addEventListener('click', () => void removeSelectedCustomPath());
    panel.querySelector('[data-ttaw-output-add]')?.addEventListener('click', () => void addOutputDocument());
    panel.querySelector('[data-ttaw-output-remove]')?.addEventListener('click', () => void removeSelectedOutputDocument());
    panel.querySelector('[data-ttaw-pre-output-add]')?.addEventListener('click', () => void addPreOutputDocument());
    panel.querySelector('[data-ttaw-pre-output-remove]')?.addEventListener('click', () => void removeSelectedPreOutputDocument());
    preAgentEnabledInput?.addEventListener('input', () => {
        void saveSettings({ preAgentEnabled: preAgentEnabledInput.checked });
    });
    preAgentProfileSelect?.addEventListener('change', () => {
        void saveSettings({ preAgentProfileId: String(preAgentProfileSelect.value || '').trim() });
    });
    preAgentPresentationInputs.forEach((input) => {
        input.addEventListener('change', () => {
            if (input.checked) {
                void saveSettings({ preAgentPresentation: input.value });
            }
        });
    });
    postAgentEnabledInput?.addEventListener('input', () => {
        void saveSettings({ postAgentEnabled: postAgentEnabledInput.checked });
    });
    postAgentAutomaticInput?.addEventListener('input', () => {
        void saveSettings({ postAgentAutomatic: postAgentAutomaticInput.checked });
    });
    postAgentProfileSelect?.addEventListener('change', () => {
        void saveSettings({ postAgentProfileId: String(postAgentProfileSelect.value || '').trim() });
    });
    postAgentPresentationInputs.forEach((input) => {
        input.addEventListener('change', () => {
            if (input.checked) {
                void saveSettings({ postAgentPresentation: input.value });
            }
        });
    });
    customPathInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void addCustomPath();
        }
    });
    customPathSelect?.addEventListener('change', () => void selectCustomPath());
    outputDocumentSelect?.addEventListener('change', () => void selectOutputDocument());
    preOutputDocumentSelect?.addEventListener('change', () => void selectPreOutputDocument());
    [outputProfileInput, outputPathInput].forEach((input) => {
        input?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                void addOutputDocument();
            }
        });
    });
    [preOutputProfileInput, preOutputPathInput].forEach((input) => {
        input?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                void addPreOutputDocument();
            }
        });
    });
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

function renderOutputDocumentList() {
    populateOutputDocumentList(
        outputDocumentSelect,
        state.settings.outputDocuments,
        state.settings.selectedOutputDocumentKey,
    );
}

function renderPreOutputDocumentList() {
    populateOutputDocumentList(
        preOutputDocumentSelect,
        state.settings.preAgentOutputDocuments,
        state.settings.selectedPreAgentOutputDocumentKey,
    );
}

function populateOutputDocumentList(select, documents, selectedKey) {
    if (!(select instanceof HTMLSelectElement)) {
        return;
    }
    select.replaceChildren();
    for (const item of documents) {
        const key = outputDocumentKey(item.profileId, item.path);
        const option = createElement('option', {
            text: `${item.profileId} -> ${item.path}`,
            attrs: { value: key },
        });
        option.selected = key === selectedKey;
        select.append(option);
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

async function selectOutputDocument() {
    const selectedOutputDocumentKey = String(outputDocumentSelect?.value || '');
    await saveSettings({ selectedOutputDocumentKey });
    renderOutputDocumentList();
}

async function addOutputDocument() {
    const profileId = String(outputProfileInput?.value || '').trim();
    const path = normalizeWorkspacePath(outputPathInput?.value);
    if (!profileId || !isUsableFilePath(path)) {
        window.toastr?.warning?.(TEXT.outputDocumentRequired);
        return;
    }

    const key = outputDocumentKey(profileId, path);
    const duplicate = state.settings.outputDocuments.some((item) => (
        outputDocumentKey(item.profileId, item.path) === key
    ));
    if (duplicate) {
        window.toastr?.info?.(TEXT.duplicateOutputDocument);
        await saveSettings({ selectedOutputDocumentKey: key });
        render();
        return;
    }

    await saveSettings({
        outputDocuments: [...state.settings.outputDocuments, { profileId, path }],
        selectedOutputDocumentKey: key,
    });
    if (outputProfileInput) {
        outputProfileInput.value = '';
    }
    if (outputPathInput) {
        outputPathInput.value = '';
    }
    render();
}

async function removeSelectedOutputDocument() {
    const selected = String(outputDocumentSelect?.value || state.settings.selectedOutputDocumentKey || '');
    if (!selected) {
        return;
    }
    const outputDocuments = state.settings.outputDocuments.filter((item) => (
        outputDocumentKey(item.profileId, item.path) !== selected
    ));
    await saveSettings({
        outputDocuments,
        selectedOutputDocumentKey: outputDocuments[0]
            ? outputDocumentKey(outputDocuments[0].profileId, outputDocuments[0].path)
            : '',
    });
    render();
}

async function selectPreOutputDocument() {
    const selectedPreAgentOutputDocumentKey = String(preOutputDocumentSelect?.value || '');
    await saveSettings({ selectedPreAgentOutputDocumentKey });
    renderPreOutputDocumentList();
}

async function addPreOutputDocument() {
    const profileId = String(preOutputProfileInput?.value || '').trim();
    const path = normalizeWorkspacePath(preOutputPathInput?.value);
    if (!profileId || !isUsableFilePath(path)) {
        window.toastr?.warning?.(TEXT.outputDocumentRequired);
        return;
    }

    const key = outputDocumentKey(profileId, path);
    const duplicate = state.settings.preAgentOutputDocuments.some((item) => (
        outputDocumentKey(item.profileId, item.path) === key
    ));
    if (duplicate) {
        window.toastr?.info?.(TEXT.duplicateOutputDocument);
        await saveSettings({ selectedPreAgentOutputDocumentKey: key });
        render();
        return;
    }

    await saveSettings({
        preAgentOutputDocuments: [...state.settings.preAgentOutputDocuments, { profileId, path }],
        selectedPreAgentOutputDocumentKey: key,
    });
    if (preOutputProfileInput) {
        preOutputProfileInput.value = '';
    }
    if (preOutputPathInput) {
        preOutputPathInput.value = '';
    }
    render();
}

async function removeSelectedPreOutputDocument() {
    const selected = String(
        preOutputDocumentSelect?.value
        || state.settings.selectedPreAgentOutputDocumentKey
        || '',
    );
    if (!selected) {
        return;
    }
    const preAgentOutputDocuments = state.settings.preAgentOutputDocuments.filter((item) => (
        outputDocumentKey(item.profileId, item.path) !== selected
    ));
    await saveSettings({
        preAgentOutputDocuments,
        selectedPreAgentOutputDocumentKey: preAgentOutputDocuments[0]
            ? outputDocumentKey(preAgentOutputDocuments[0].profileId, preAgentOutputDocuments[0].path)
            : '',
    });
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

async function preAgentGenerateInterceptor(_chat, _contextSize, abort, type) {
    if (state.preAgentBypass || !state.settings.preAgentEnabled || type !== 'normal') {
        return;
    }

    const context = getContext();
    const chat = context?.chat;
    const message = Array.isArray(chat) ? chat[chat.length - 1] : null;
    if (!message?.is_user || message.is_system) {
        return;
    }

    const profileId = String(state.settings.preAgentProfileId || '').trim();
    if (!profileId) {
        window.toastr?.warning?.(TEXT.profileRequired);
        return;
    }
    if (isPreAgentWorkflowBusy()) {
        abort(true);
        await rejectAdditionalPreAgentMessage(message);
        window.toastr?.warning?.(TEXT.workflowActive);
        return;
    }
    if (isPostAgentWorkflowBusy() || getActiveAgentRun()?.runId) {
        window.toastr?.warning?.(TEXT.workflowActive);
        return;
    }

    abort(true);
    await deleteLastMessage();
    await context.saveChat?.();
    await startPreAgentWorkflow(String(message.mes || ''));
}

async function rejectAdditionalPreAgentMessage(message) {
    await deleteLastMessage();
    await getContext()?.saveChat?.();
    const textarea = document.querySelector('#send_textarea');
    if (textarea instanceof HTMLTextAreaElement) {
        const existing = String(textarea.value || '').trim();
        const restored = String(message?.mes || '').trim();
        textarea.value = [restored, existing].filter(Boolean).join('\n');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

async function startPreAgentWorkflow(originalMessage) {
    const profileId = String(state.settings.preAgentProfileId || '').trim();
    const presentation = state.settings.preAgentPresentation;
    const context = getContext();
    const chat = context?.chat;
    if (!Array.isArray(chat)) {
        throw new Error('Current chat is unavailable.');
    }
    state.preAgentStarting = true;
    state.preAgentStopping = false;
    state.preAgentIntercepting = true;
    state.preAgentPhase = 'starting';
    state.preAgentRootProfileId = profileId;
    state.preAgentForegroundProfileId = profileId;
    state.preAgentProfileId = profileId;
    state.preAgentPresentation = presentation;
    state.preAgentLastRunId = '';
    state.preAgentLastEventType = '';
    state.preAgentChat = chat;
    state.preAgentOriginalMessage = String(originalMessage || '');
    state.preAgentActiveInvocations.clear();
    state.error = '';
    render();
    window.toastr?.info?.(TEXT.preWorkflowStarting);

    try {
        const temporaryMessage = {
            name: String(context.name1 || 'User'),
            is_user: true,
            is_system: false,
            mes: state.preAgentOriginalMessage,
            send_date: new Date().toISOString(),
            extra: {},
        };
        chat.push(temporaryMessage);
        let handle;
        try {
            handle = await agentApi().startRunFromLegacyGenerate({
                generationType: 'normal',
                profileId,
                presentation,
                options: { presentation },
            });
        } finally {
            const temporaryIndex = chat.indexOf(temporaryMessage);
            if (temporaryIndex >= 0) {
                chat.splice(temporaryIndex, 1);
            }
        }
        const runId = String(handle?.runId || '').trim();
        if (!runId) {
            throw new Error('Pre-Agent workflow did not return a runId.');
        }

        state.preAgentUnsubscribe?.();
        state.preAgentRunId = runId;
        state.preAgentLastRunId = runId;
        state.preAgentPhase = 'running';
        state.activeRunId = runId;
        state.currentRun = handle;
        state.events = [];
        state.discoveredPaths = [];
        state.selectedPath = '';
        state.selectedFile = null;
        state.preAgentUnsubscribe = agentApi().subscribe(runId, (event) => {
            state.preAgentLastEventType = String(event?.type || '');
            updatePreAgentProfileFromEvent(event);
            addRunEvent(event);
            if (TERMINAL_RUN_EVENTS.has(event?.type)) {
                void finishPreAgentWorkflow(runId, event.type);
            }
            render();
        }, {
            onError(error) {
                state.error = String(error?.message || error);
                render();
            },
        });
        window.toastr?.success?.(TEXT.preWorkflowStarted);
    } catch (error) {
        state.preAgentPhase = 'failed';
        state.error = String(error?.message || error);
        window.toastr?.error?.(state.error);
        await completePreAgentInterception('', []);
    } finally {
        state.preAgentStarting = false;
        render();
    }
}

function updatePreAgentProfileFromEvent(event) {
    const type = String(event?.type || '');
    const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {};
    const seq = Number(event?.seq || 0);
    const invocationId = String(payload.invocationId || payload.childInvocationId || payload.newInvocationId || '').trim();
    const profileId = String(payload.profileId || payload.targetProfileId || '').trim();

    if (type === 'agent_handoff_accepted') {
        const sourceInvocationId = String(payload.sourceInvocationId || '').trim();
        const newInvocationId = String(payload.newInvocationId || '').trim();
        const targetProfileId = String(payload.targetProfileId || '').trim();
        if (sourceInvocationId) {
            state.preAgentActiveInvocations.delete(sourceInvocationId);
        }
        if (newInvocationId && targetProfileId) {
            state.preAgentForegroundProfileId = targetProfileId;
            state.preAgentProfileId = targetProfileId;
            state.preAgentActiveInvocations.set(newInvocationId, { profileId: targetProfileId, seq });
        }
    }

    if ((type === 'agent_invocation_started'
        || type === 'agent_task_started'
        || type === 'agent_delegate_started')
        && invocationId
        && profileId) {
        state.preAgentActiveInvocations.set(invocationId, { profileId, seq });
    }

    if ((type === 'agent_invocation_completed'
        || type === 'agent_invocation_failed'
        || type === 'agent_invocation_cancelled'
        || type === 'agent_invocation_transferred'
        || type === 'agent_task_completed'
        || type === 'agent_task_failed'
        || type === 'agent_task_cancelled')
        && invocationId) {
        state.preAgentActiveInvocations.delete(invocationId);
    }

    const active = [...state.preAgentActiveInvocations.values()]
        .sort((left, right) => right.seq - left.seq)[0];
    state.preAgentProfileId = active?.profileId
        || state.preAgentForegroundProfileId
        || state.preAgentRootProfileId;
}

async function stopPreAgentWorkflow() {
    const runId = state.preAgentRunId;
    if (!runId || state.preAgentStopping) {
        return;
    }

    state.preAgentStopping = true;
    state.preAgentPhase = 'stopping';
    render();
    try {
        await agentApi().cancel(runId);
        window.toastr?.info?.(TEXT.preStopRequested);
    } catch (error) {
        state.preAgentPhase = 'running';
        state.error = String(error?.message || error);
        window.toastr?.error?.(state.error);
    } finally {
        state.preAgentStopping = false;
        render();
    }
}

async function finishPreAgentWorkflow(runId, terminalEventType = '') {
    if (runId !== state.preAgentRunId) {
        return;
    }
    const unsubscribe = state.preAgentUnsubscribe;
    state.preAgentUnsubscribe = null;
    state.preAgentRunId = '';
    state.activeRunId = '';
    state.preAgentStopping = false;
    state.preAgentPhase = workflowPhaseForTerminalEvent(terminalEventType);
    unsubscribe?.();
    render();

    const contents = await readPreAgentOutputDocuments(runId);
    await completePreAgentInterception(runId, contents);
}

async function readPreAgentOutputDocuments(runId) {
    const contents = [];
    const seenPaths = new Set();
    for (const mapping of state.settings.preAgentOutputDocuments) {
        if (seenPaths.has(mapping.path)) {
            continue;
        }
        seenPaths.add(mapping.path);
        try {
            const file = await agentApi().readWorkspaceFile({ runId, path: mapping.path });
            const text = String(file?.text || '').trim();
            if (text) {
                contents.push(text);
            }
        } catch (error) {
            console.warn(
                `[AgentWorkspaceFloat] Pre-Agent output document is unavailable: ${mapping.path}`,
                error,
            );
        }
    }
    return contents;
}

async function completePreAgentInterception(_runId, contents) {
    if (getContext()?.chat !== state.preAgentChat) {
        state.preAgentIntercepting = false;
        state.preAgentChat = null;
        window.toastr?.warning?.(TEXT.preAgentMessageChanged);
        render();
        return;
    }

    const combined = [
        state.preAgentOriginalMessage,
        ...contents,
    ].map((part) => String(part || '').trim()).filter(Boolean).join('\n\n');
    state.preAgentIntercepting = false;
    state.preAgentChat = null;
    state.preAgentOriginalMessage = '';
    render();
    setTimeout(() => void resumeInterceptedUserMessage(combined), 0);
}

async function resumeInterceptedUserMessage(message) {
    const textarea = document.querySelector('#send_textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) {
        window.toastr?.error?.(TEXT.preAgentResumeFailed);
        return;
    }
    const draft = String(textarea.value || '');
    textarea.value = message;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    state.preAgentBypass = true;
    try {
        await sendTextareaMessage();
        if (!textarea.value) {
            textarea.value = draft;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    } catch (error) {
        console.error('[AgentWorkspaceFloat] Failed to resume intercepted user message:', error);
        window.toastr?.error?.(TEXT.preAgentResumeFailed);
        textarea.value = [message, draft].filter(Boolean).join('\n\n');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } finally {
        state.preAgentBypass = false;
    }
}

function isPreAgentWorkflowBusy() {
    return state.preAgentStarting
        || state.preAgentStopping
        || state.preAgentIntercepting
        || Boolean(state.preAgentRunId);
}

function installPreAgentSendGuard() {
    const blockSend = (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.toastr?.warning?.(TEXT.workflowActive);
    };
    const interceptSend = (event, messageOverride = null, afterIntercept = null) => {
        if (state.preAgentBypass) {
            return;
        }
        if (isPreAgentWorkflowBusy()) {
            blockSend(event);
            return;
        }
        if (!state.settings.preAgentEnabled
            || isPostAgentWorkflowBusy()
            || getActiveAgentRun()?.runId) {
            return;
        }

        const textarea = document.querySelector('#send_textarea');
        if (!(textarea instanceof HTMLTextAreaElement)) {
            return;
        }
        const message = messageOverride ?? (
            String(textarea.value || '')
        );
        if (!message.trim() || message.trimStart().startsWith('/')) {
            return;
        }
        if (!String(state.settings.preAgentProfileId || '').trim()) {
            window.toastr?.warning?.(TEXT.profileRequired);
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        textarea.value = '';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        afterIntercept?.();
        void startPreAgentWorkflow(message).catch((error) => {
            console.error('[AgentWorkspaceFloat] Failed to intercept user message:', error);
            textarea.value = message;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            window.toastr?.error?.(String(error?.message || error));
        });
    };
    const onClick = (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }
        if (event.target.closest('#send_but')) {
            interceptSend(event);
            return;
        }
        if (event.target.closest('[data-tt-chat-input-editor-action="send"]')) {
            const editor = document.querySelector('#tt-chat-input-editor .tt-chat-input-editor__textarea');
            const dialog = document.querySelector('#tt-chat-input-editor');
            interceptSend(event, editor instanceof HTMLTextAreaElement ? editor.value : '', () => {
                if (editor instanceof HTMLTextAreaElement) {
                    editor.value = '';
                }
                if (dialog instanceof HTMLDialogElement && dialog.open) {
                    dialog.close();
                }
            });
        }
    };
    const onKeyDown = (event) => {
        if (event.target?.id === 'send_textarea'
            && event.key === 'Enter'
            && !event.shiftKey
            && !event.altKey
            && !event.isComposing
            && getContext()?.shouldSendOnEnter?.()) {
            interceptSend(event);
            return;
        }
        if (event.target instanceof HTMLTextAreaElement
            && event.target.closest('#tt-chat-input-editor')
            && event.key === 'Enter'
            && (event.ctrlKey || event.metaKey)
            && !event.shiftKey
            && !event.altKey
            && !event.isComposing) {
            const editor = event.target;
            const dialog = editor.closest('#tt-chat-input-editor');
            interceptSend(event, editor.value, () => {
                editor.value = '';
                if (dialog instanceof HTMLDialogElement && dialog.open) {
                    dialog.close();
                }
            });
        }
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
    };
}

async function startPostAgentWorkflow() {
    if (!state.settings.postAgentEnabled || !isLatestChatMessageAiReply()) {
        return;
    }
    const profileId = String(state.settings.postAgentProfileId || '').trim();
    const presentation = state.settings.postAgentPresentation;
    if (!profileId) {
        window.toastr?.warning?.(TEXT.profileRequired);
        return;
    }
    if (isPostAgentWorkflowBusy() || getActiveAgentRun()?.runId) {
        window.toastr?.warning?.(TEXT.workflowActive);
        return;
    }

    state.workflowStarting = true;
    state.workflowStopping = false;
    state.workflowPhase = 'starting';
    state.workflowRootProfileId = profileId;
    state.workflowForegroundProfileId = profileId;
    state.workflowProfileId = profileId;
    state.workflowPresentation = presentation;
    state.workflowLastRunId = '';
    state.workflowLastEventType = '';
    state.workflowActiveInvocations.clear();
    state.workflowOutputHandledInvocations.clear();
    state.error = '';
    render();
    window.toastr?.info?.(TEXT.workflowStarting);

    try {
        const handle = await agentApi().startRunFromLegacyGenerate({
            generationType: 'normal',
            profileId,
            presentation,
            options: { presentation },
        });
        const runId = String(handle?.runId || '').trim();
        if (!runId) {
            throw new Error('Agent workflow did not return a runId.');
        }

        state.workflowUnsubscribe?.();
        state.workflowRunId = runId;
        state.workflowLastRunId = runId;
        state.workflowPhase = 'running';
        state.activeRunId = runId;
        state.currentRun = handle;
        state.events = [];
        state.discoveredPaths = [];
        state.selectedPath = '';
        state.selectedFile = null;
        state.workflowUnsubscribe = agentApi().subscribe(runId, (event) => {
            state.workflowLastEventType = String(event?.type || '');
            updateWorkflowProfileFromEvent(event);
            addRunEvent(event);
            queueProfileOutputDocuments(runId, event);
            if (TERMINAL_RUN_EVENTS.has(event?.type)) {
                finishPostAgentWorkflow(runId, event.type);
            }
            render();
        }, {
            onError(error) {
                state.error = String(error?.message || error);
                render();
            },
        });
        window.toastr?.success?.(TEXT.workflowStarted);
    } catch (error) {
        state.workflowPhase = 'failed';
        state.error = String(error?.message || error);
        window.toastr?.error?.(state.error);
    } finally {
        state.workflowStarting = false;
        render();
    }
}

function isLatestChatMessageAiReply(expectedMessageId = null) {
    const chat = getContext()?.chat;
    if (!Array.isArray(chat) || chat.length === 0) {
        return false;
    }
    const latestMessageId = chat.length - 1;
    if (expectedMessageId !== null && String(expectedMessageId) !== String(latestMessageId)) {
        return false;
    }
    const latestMessage = chat[latestMessageId];
    return Boolean(latestMessage && !latestMessage.is_user && !latestMessage.is_system);
}

function subscribeAutomaticPostAgent() {
    const context = getContext();
    const eventName = context?.eventTypes?.MESSAGE_RECEIVED;
    const eventSource = context?.eventSource;
    if (!eventName || typeof eventSource?.on !== 'function') {
        console.warn('[AgentWorkspaceFloat] Chat message events are unavailable.');
        return () => {};
    }

    const onMessageReceived = (messageId) => {
        if (!state.settings.postAgentEnabled
            || !state.settings.postAgentAutomatic
            || !isLatestChatMessageAiReply(messageId)) {
            return;
        }
        void startPostAgentWorkflow();
    };
    eventSource.on(eventName, onMessageReceived);
    return () => eventSource.removeListener?.(eventName, onMessageReceived);
}

function queueProfileOutputDocuments(runId, event) {
    if (!TERMINAL_INVOCATION_EVENTS.has(event?.type)) {
        return;
    }
    const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {};
    const invocationId = String(payload.invocationId || '').trim();
    const profileId = String(payload.profileId || '').trim();
    if (!invocationId || !profileId) {
        return;
    }

    const key = `${runId}:${invocationId}`;
    if (state.workflowOutputHandledInvocations.has(key)) {
        return;
    }
    state.workflowOutputHandledInvocations.add(key);

    const mappings = state.settings.outputDocuments
        .filter((item) => item.profileId === profileId)
        .map((item) => ({ ...item }));
    if (mappings.length === 0) {
        return;
    }

    state.workflowOutputQueue = state.workflowOutputQueue
        .then(() => appendProfileOutputDocuments(runId, profileId, mappings))
        .catch((error) => {
            console.error('[AgentWorkspaceFloat] Failed to append profile output documents:', error);
            window.toastr?.error?.(`${TEXT.outputAppendFailed} ${String(error?.message || error)}`);
        });
}

async function appendProfileOutputDocuments(runId, profileId, mappings) {
    const contents = [];
    for (const mapping of mappings) {
        try {
            const file = await agentApi().readWorkspaceFile({
                runId,
                path: mapping.path,
            });
            const text = String(file?.text || '').trim();
            if (text) {
                contents.push(text);
            }
        } catch (error) {
            console.warn(
                `[AgentWorkspaceFloat] Output document is unavailable for profile '${profileId}': ${mapping.path}`,
                error,
            );
        }
    }
    if (contents.length === 0) {
        return;
    }
    await appendToLatestChatMessage(contents.join('\n\n'));
}

async function appendToLatestChatMessage(content) {
    const context = getContext();
    const chat = context?.chat;
    if (!Array.isArray(chat) || chat.length === 0) {
        throw new Error('Current chat has no message to append to.');
    }

    const messageId = chat.length - 1;
    const message = chat[messageId];
    if (!message || typeof message !== 'object') {
        throw new Error('Latest chat message is invalid.');
    }

    message.mes = appendMessageContent(message.mes, content);
    const swipeId = Number(message.swipe_id);
    if (Array.isArray(message.swipes)
        && Number.isInteger(swipeId)
        && swipeId >= 0
        && swipeId < message.swipes.length) {
        message.swipes[swipeId] = message.mes;
    }
    if (typeof message.extra?.display_text === 'string') {
        message.extra.display_text = appendMessageContent(message.extra.display_text, content);
    }

    if (context.chatMetadata && typeof context.chatMetadata === 'object') {
        context.chatMetadata.tainted = true;
    }
    markWindowedChatDirtyFromIndex(messageId);
    context.updateMessageBlock(messageId, message);
    const messageUpdatedEvent = context.eventTypes?.MESSAGE_UPDATED;
    if (messageUpdatedEvent && typeof context.eventSource?.emit === 'function') {
        await context.eventSource.emit(messageUpdatedEvent, messageId);
    }
    await context.saveChat();
}

function appendMessageContent(existing, content) {
    const base = String(existing || '').trimEnd();
    const addition = String(content || '').trim();
    return base ? `${base}\n\n${addition}` : addition;
}

function isPostAgentWorkflowBusy() {
    return state.workflowStarting || state.workflowStopping || Boolean(state.workflowRunId);
}

function updateWorkflowProfileFromEvent(event) {
    const type = String(event?.type || '');
    const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {};
    const seq = Number(event?.seq || 0);
    const invocationId = String(payload.invocationId || payload.childInvocationId || payload.newInvocationId || '').trim();
    const profileId = String(payload.profileId || payload.targetProfileId || '').trim();

    if (type === 'agent_handoff_accepted') {
        const sourceInvocationId = String(payload.sourceInvocationId || '').trim();
        const newInvocationId = String(payload.newInvocationId || '').trim();
        const targetProfileId = String(payload.targetProfileId || '').trim();
        if (sourceInvocationId) {
            state.workflowActiveInvocations.delete(sourceInvocationId);
        }
        if (newInvocationId && targetProfileId) {
            state.workflowForegroundProfileId = targetProfileId;
            state.workflowActiveInvocations.set(newInvocationId, {
                profileId: targetProfileId,
                seq,
            });
        }
    }

    if ((type === 'agent_invocation_started'
        || type === 'agent_task_started'
        || type === 'agent_delegate_started')
        && invocationId
        && profileId) {
        state.workflowActiveInvocations.set(invocationId, { profileId, seq });
    }

    if ((type === 'agent_invocation_completed'
        || type === 'agent_invocation_failed'
        || type === 'agent_invocation_cancelled'
        || type === 'agent_invocation_transferred'
        || type === 'agent_task_completed'
        || type === 'agent_task_failed'
        || type === 'agent_task_cancelled')
        && invocationId) {
        state.workflowActiveInvocations.delete(invocationId);
    }

    const active = [...state.workflowActiveInvocations.values()]
        .sort((left, right) => right.seq - left.seq)[0];
    state.workflowProfileId = active?.profileId
        || state.workflowForegroundProfileId
        || state.workflowRootProfileId;
}

async function stopPostAgentWorkflow() {
    const runId = state.workflowRunId;
    if (!runId || state.workflowStopping) {
        return;
    }

    state.workflowStopping = true;
    state.workflowPhase = 'stopping';
    render();
    try {
        await agentApi().cancel(runId);
        window.toastr?.info?.(TEXT.stopRequested);
    } catch (error) {
        state.workflowPhase = 'running';
        state.error = String(error?.message || error);
        window.toastr?.error?.(state.error);
    } finally {
        state.workflowStopping = false;
        render();
    }
}

function finishPostAgentWorkflow(runId, terminalEventType = '') {
    if (runId !== state.workflowRunId) {
        return;
    }
    const unsubscribe = state.workflowUnsubscribe;
    state.workflowUnsubscribe = null;
    state.workflowRunId = '';
    state.activeRunId = '';
    state.workflowStopping = false;
    state.workflowPhase = workflowPhaseForTerminalEvent(terminalEventType);
    unsubscribe?.();
}

function workflowPhaseForTerminalEvent(eventType) {
    switch (eventType) {
        case 'run_completed':
            return 'completed';
        case 'run_partial_success':
            return 'partial_success';
        case 'run_cancelled':
            return 'cancelled';
        default:
            return 'failed';
    }
}

function workflowPhaseLabel(phase) {
    const labels = {
        idle: TEXT.workflowIdle,
        starting: TEXT.workflowStarting,
        running: TEXT.workflowRunning,
        stopping: TEXT.workflowStopping,
        completed: TEXT.workflowCompleted,
        partial_success: TEXT.workflowPartialSuccess,
        cancelled: TEXT.workflowCancelled,
        failed: TEXT.workflowFailed,
    };
    return labels[phase] || TEXT.workflowIdle;
}

function preAgentWorkflowPhaseLabel(phase) {
    if (phase === 'starting') {
        return TEXT.preWorkflowStarting;
    }
    return workflowPhaseLabel(phase);
}

function renderWorkflowStatus() {
    const profileName = agentProfileLabel(state.workflowProfileId);
    const values = {
        '[data-ttaw-workflow-status]': workflowPhaseLabel(state.workflowPhase),
        '[data-ttaw-workflow-profile]': profileName || TEXT.none,
        '[data-ttaw-workflow-presentation]': state.workflowPresentation
            ? (state.workflowPresentation === 'foreground' ? TEXT.foreground : TEXT.background)
            : TEXT.none,
        '[data-ttaw-workflow-run-id]': state.workflowLastRunId || TEXT.none,
        '[data-ttaw-workflow-last-event]': state.workflowLastEventType || TEXT.none,
    };
    for (const [selector, value] of Object.entries(values)) {
        const element = panel?.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }
    const stopButton = panel?.querySelector('[data-ttaw-stop-workflow]');
    if (stopButton instanceof HTMLButtonElement) {
        stopButton.disabled = !state.workflowRunId || state.workflowStopping || state.workflowPhase === 'stopping';
    }
}

function renderPreAgentWorkflowStatus() {
    const values = {
        '[data-ttaw-pre-workflow-status]': preAgentWorkflowPhaseLabel(state.preAgentPhase),
        '[data-ttaw-pre-workflow-profile]': agentProfileLabel(state.preAgentProfileId) || TEXT.none,
        '[data-ttaw-pre-workflow-presentation]': state.preAgentPresentation
            ? (state.preAgentPresentation === 'foreground' ? TEXT.foreground : TEXT.background)
            : TEXT.none,
        '[data-ttaw-pre-workflow-run-id]': state.preAgentLastRunId || TEXT.none,
        '[data-ttaw-pre-workflow-last-event]': state.preAgentLastEventType || TEXT.none,
    };
    for (const [selector, value] of Object.entries(values)) {
        const element = panel?.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }
    const stopButton = panel?.querySelector('[data-ttaw-stop-pre-workflow]');
    if (stopButton instanceof HTMLButtonElement) {
        stopButton.disabled = !state.preAgentRunId
            || state.preAgentStopping
            || state.preAgentPhase === 'stopping';
    }
}

function agentProfileLabel(profileId) {
    const profile = state.agentProfiles.find((item) => item.id === profileId);
    const displayName = String(profile?.displayName || profile?.id || '');
    return profile
        ? (displayName === profile.id ? profile.id : `${displayName} (${profile.id})`)
        : profileId;
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
    const visible = Boolean(state.settings.bubbleEnabled);
    root.hidden = !visible;
    bubble.hidden = !visible;
    const workflowBusy = isPreAgentWorkflowBusy() || isPostAgentWorkflowBusy();
    bubble.classList.toggle('is-workflow-busy', workflowBusy);
    bubble.setAttribute('aria-busy', String(workflowBusy));
    panel.hidden = !visible || !state.open;
    syncExtensionSettings();

    if (titleRun) {
        const isActiveRun = state.currentRun?.runId && state.currentRun.runId === state.activeRunId;
        titleRun.textContent = state.currentRun?.runId
            ? `${isActiveRun ? TEXT.running : TEXT.lastRun} ${shortRunId(state.currentRun.runId)}`
            : TEXT.waitingRun;
    }
    if (statusLine) {
        const parts = [];
        if (state.preAgentStarting) {
            parts.push(TEXT.preWorkflowStarting);
        }
        if (state.workflowStarting) {
            parts.push(TEXT.workflowStarting);
        }
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
    renderOutputDocumentList();
    renderPreOutputDocumentList();
    renderWorkflowStatus();
    renderPreAgentWorkflowStatus();

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
    mountExtensionSettings();
    mountDom();
    state.unsubscribers.push(installPreAgentSendGuard());
    await refreshAgentProfiles();
    state.unsubscribers.push(subscribeAgentProfilesChanged(() => {
        void refreshAgentProfiles();
    }));
    state.unsubscribers.push(subscribeAutomaticPostAgent());
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

globalThis[PRE_AGENT_INTERCEPTOR_KEY] = preAgentGenerateInterceptor;

void init().catch((error) => {
    console.error('[AgentWorkspaceFloat] Failed to initialize:', error);
    window.toastr?.error?.(String(error?.message || error));
});
