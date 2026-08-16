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
    POPUP_RESULT,
    Popup,
} from '/scripts/popup.js';
import {
    deleteLastMessage,
    sendTextareaMessage,
} from '/script.js';
import * as sillyTavernScript from '/script.js';
import {
    createWorldInfoEntry,
    loadWorldInfo,
    newWorldInfoEntryDefinition,
    reloadEditor,
    saveWorldInfo,
    updateWorldInfoList,
    world_names,
} from '/scripts/world-info.js';

const MODULE_NAME = 'agent-workspace-float';
const SETTINGS_KEY = 'settings';
const RUN_EVENT_TAIL_SEQ = Number.MAX_SAFE_INTEGER;
const RUN_EVENT_PAGE_LIMIT = 240;
const MIN_PANEL_WIDTH = 360;
const MIN_PANEL_HEIGHT = 360;
const CUSTOM_ROOT_ID = '__custom__';
const BUBBLE_CLICK_DELAY_MS = 240;
const PRE_AGENT_INTERCEPTOR_KEY = 'agentWorkspaceFloatPreAgentInterceptor';
const BUBBLE_LONG_PRESS_MS = 650;
const DEFAULT_WORLD_INFO_PARAMS_PATH = 'scratch/worldinfo_create.jsonl';
const DEFAULT_WORLD_INFO_RETENTION_LAYERS = 10;
const TERMINAL_RUN_EVENTS = new Set(['run_completed', 'run_partial_success', 'run_cancelled', 'run_failed']);
const TERMINAL_INVOCATION_EVENTS = new Set([
    'agent_invocation_completed',
    'agent_invocation_failed',
    'agent_invocation_cancelled',
    'agent_invocation_transferred',
]);

function markLegacyWindowedChatDirtyFromIndex(messageId) {
    const markDirty = sillyTavernScript.markWindowedChatDirtyFromIndex;
    if (typeof markDirty === 'function') {
        markDirty(messageId);
    }
}

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
    preAgentAutomatic: '\u81ea\u52a8',
    shortcut: '\u5feb\u6377\u952e',
    shortcutDoubleClick: '\u53cc\u51fb',
    shortcutRightClick: '\u53f3\u51fb',
    shortcutLongPress: '\u957f\u6309',
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
    preAgentMessageRequired: '\u8bf7\u5148\u5728\u8f93\u5165\u6846\u4e2d\u8f93\u5165\u8981\u53d1\u9001\u7684\u6d88\u606f\u3002',
    worldInfoStorageTitle: '\u4e16\u754c\u4e66\u5b58\u50a8',
    worldInfoStorageHelp: '\u540e\u7f6e Agent run \u7ed3\u675f\u540e\uff0c\u4ece\u5de5\u4f5c\u533a\u8bfb\u53d6 JSONL \u53c2\u6570\u6587\u4ef6\uff0c\u5e76\u5c06\u6587\u6863\u5185\u5bb9\u5199\u5165\u6240\u9009\u4e16\u754c\u4e66\u3002',
    worldInfoStorageEnabled: '\u542f\u7528',
    worldInfoBook: '\u4e16\u754c\u4e66',
    noWorldInfoBooks: '\u6ca1\u6709\u53ef\u7528\u7684\u4e16\u754c\u4e66',
    worldInfoParamsPath: '\u53c2\u6570\u6587\u4ef6\u8def\u5f84',
    worldInfoRetentionLayers: '\u4fdd\u7559\u5c42\u6570',
    worldInfoBookRequired: '\u8bf7\u5148\u9009\u62e9\u4e16\u754c\u4e66\u3002',
    worldInfoStored: '\u5df2\u5199\u5165\u4e16\u754c\u4e66\u6761\u76ee',
    worldInfoStoreFailed: '\u4e16\u754c\u4e66\u5b58\u50a8\u5931\u8d25\u3002',
    worldInfoCleanupTitle: '\u4e16\u754c\u4e66\u8bb0\u5f55\u6e05\u7406',
    worldInfoCleanupConfirm: '\u672c\u6b21\u6e05\u7406\u5c06\u5220\u9664\u8d85\u8fc7 5 \u6761\u53ef\u8bc6\u522b\u8bb0\u5f55\u3002\u4f60\u53ef\u4ee5\u76f4\u63a5\u5220\u9664\uff0c\u6216\u5148\u5907\u4efd\u5f53\u524d\u4e16\u754c\u4e66\u540e\u518d\u5220\u9664\u3002',
    worldInfoCleanupDirect: '\u76f4\u63a5\u5220\u9664',
    worldInfoCleanupBackup: '\u5907\u4efd\u540e\u5220\u9664',
    worldInfoCleanupCancel: '\u53d6\u6d88',
    worldInfoBackupCreated: '\u5df2\u5907\u4efd\u4e16\u754c\u4e66',
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
    preAgentAutomatic: false,
    preAgentShortcut: 'long_press',
    preAgentPresentation: 'background',
    preAgentProfileId: '',
    preAgentOutputDocuments: [],
    selectedPreAgentOutputDocumentKey: '',
    postAgentEnabled: true,
    postAgentAutomatic: false,
    postAgentShortcut: 'double_click',
    postAgentPresentation: 'background',
    postAgentProfileId: '',
    worldInfoStorageEnabled: false,
    worldInfoBookName: '',
    worldInfoParamsPath: DEFAULT_WORLD_INFO_PARAMS_PATH,
    worldInfoRetentionLayers: DEFAULT_WORLD_INFO_RETENTION_LAYERS,
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
    preAgentAutoSend: false,
    preAgentPersistTargetMessageId: null,
    preAgentPersistWritePromise: Promise.resolve(),
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
    workflowChat: null,
    workflowPersistTargetMessageId: null,
    workflowPersistWritePromise: Promise.resolve(),
    workflowActiveInvocations: new Map(),
    workflowOutputHandledInvocations: new Set(),
    workflowOutputQueue: Promise.resolve(),
    workflowUnsubscribe: null,
    worldInfoNames: [],
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
let preAgentAutomaticInput = null;
let preAgentShortcutSelect = null;
let preAgentProfileSelect = null;
let preAgentPresentationInputs = [];
let postAgentEnabledInput = null;
let postAgentAutomaticInput = null;
let postAgentShortcutSelect = null;
let postAgentProfileSelect = null;
let postAgentPresentationInputs = [];
let worldInfoStorageEnabledInput = null;
let worldInfoBookSelect = null;
let worldInfoParamsPathInput = null;
let worldInfoRetentionLayersInput = null;
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

function sanitizeBubbleShortcut(value, fallback) {
    return ['double_click', 'right_click', 'long_press'].includes(value)
        ? value
        : fallback;
}

function sanitizeNonNegativeInteger(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0
        ? Math.floor(number)
        : fallback;
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
        preAgentAutomatic: typeof value?.preAgentAutomatic === 'boolean'
            ? value.preAgentAutomatic
            : DEFAULT_SETTINGS.preAgentAutomatic,
        preAgentShortcut: sanitizeBubbleShortcut(value?.preAgentShortcut, DEFAULT_SETTINGS.preAgentShortcut),
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
        postAgentShortcut: sanitizeBubbleShortcut(value?.postAgentShortcut, DEFAULT_SETTINGS.postAgentShortcut),
        postAgentPresentation,
        postAgentProfileId: String(value?.postAgentProfileId || '').trim(),
        worldInfoStorageEnabled: typeof value?.worldInfoStorageEnabled === 'boolean'
            ? value.worldInfoStorageEnabled
            : DEFAULT_SETTINGS.worldInfoStorageEnabled,
        worldInfoBookName: String(value?.worldInfoBookName || '').trim(),
        worldInfoParamsPath: normalizeWorkspacePath(value?.worldInfoParamsPath || DEFAULT_SETTINGS.worldInfoParamsPath),
        worldInfoRetentionLayers: sanitizeNonNegativeInteger(
            value?.worldInfoRetentionLayers,
            DEFAULT_SETTINGS.worldInfoRetentionLayers,
        ),
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

async function refreshWorldInfoNames() {
    try {
        await updateWorldInfoList();
    } catch (error) {
        console.warn('[AgentWorkspaceFloat] Failed to refresh World Info list:', error);
    }
    const contextNames = getContext()?.getWorldInfoNames?.();
    state.worldInfoNames = (Array.isArray(world_names) && world_names.length > 0
        ? world_names
        : (Array.isArray(contextNames) ? contextNames : []))
        .map((name) => String(name || '').trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
    renderWorldInfoOptions();
}

function renderWorldInfoOptions() {
    if (!(worldInfoBookSelect instanceof HTMLSelectElement)) {
        return;
    }
    worldInfoBookSelect.replaceChildren();
    if (state.worldInfoNames.length === 0) {
        const option = createElement('option', {
            text: TEXT.noWorldInfoBooks,
            attrs: { value: '', disabled: 'disabled' },
        });
        option.selected = true;
        worldInfoBookSelect.append(option);
        worldInfoBookSelect.disabled = true;
        return;
    }

    worldInfoBookSelect.disabled = false;
    const emptyOption = createElement('option', {
        text: TEXT.none,
        attrs: { value: '' },
    });
    emptyOption.selected = !state.settings.worldInfoBookName;
    worldInfoBookSelect.append(emptyOption);
    for (const name of state.worldInfoNames) {
        const option = createElement('option', {
            text: name,
            attrs: { value: name },
        });
        option.selected = name === state.settings.worldInfoBookName;
        worldInfoBookSelect.append(option);
    }
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
    if (postAgentShortcutSelect && postAgentShortcutSelect.value !== state.settings.postAgentShortcut) {
        postAgentShortcutSelect.value = state.settings.postAgentShortcut;
    }
    postAgentPresentationInputs.forEach((input) => {
        input.checked = input.value === state.settings.postAgentPresentation;
    });
    if (postAgentProfileSelect && postAgentProfileSelect.value !== state.settings.postAgentProfileId) {
        postAgentProfileSelect.value = state.settings.postAgentProfileId;
    }
    if (worldInfoStorageEnabledInput) {
        worldInfoStorageEnabledInput.checked = Boolean(state.settings.worldInfoStorageEnabled);
    }
    if (worldInfoBookSelect && worldInfoBookSelect.value !== state.settings.worldInfoBookName) {
        worldInfoBookSelect.value = state.settings.worldInfoBookName;
    }
    if (worldInfoParamsPathInput && worldInfoParamsPathInput.value !== state.settings.worldInfoParamsPath) {
        worldInfoParamsPathInput.value = state.settings.worldInfoParamsPath;
    }
    if (worldInfoRetentionLayersInput
        && worldInfoRetentionLayersInput.value !== String(state.settings.worldInfoRetentionLayers)) {
        worldInfoRetentionLayersInput.value = String(state.settings.worldInfoRetentionLayers);
    }
    if (preAgentEnabledInput) {
        preAgentEnabledInput.checked = Boolean(state.settings.preAgentEnabled);
    }
    if (preAgentAutomaticInput) {
        preAgentAutomaticInput.checked = Boolean(state.settings.preAgentAutomatic);
    }
    if (preAgentShortcutSelect && preAgentShortcutSelect.value !== state.settings.preAgentShortcut) {
        preAgentShortcutSelect.value = state.settings.preAgentShortcut;
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
                    <label class="checkbox_label">
                        <input type="checkbox" data-ttaw-pre-agent-automatic>
                        <span>${TEXT.preAgentAutomatic}</span>
                    </label>
                </div>
                <label class="ttaw-extension-field" for="ttaw-pre-agent-shortcut">
                    <span>${TEXT.shortcut}</span>
                    <select id="ttaw-pre-agent-shortcut" class="text_pole" data-ttaw-pre-agent-shortcut>
                        <option value="double_click">${TEXT.shortcutDoubleClick}</option>
                        <option value="right_click">${TEXT.shortcutRightClick}</option>
                        <option value="long_press">${TEXT.shortcutLongPress}</option>
                    </select>
                </label>
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
                <label class="ttaw-extension-field" for="ttaw-post-agent-shortcut">
                    <span>${TEXT.shortcut}</span>
                    <select id="ttaw-post-agent-shortcut" class="text_pole" data-ttaw-post-agent-shortcut>
                        <option value="double_click">${TEXT.shortcutDoubleClick}</option>
                        <option value="right_click">${TEXT.shortcutRightClick}</option>
                        <option value="long_press">${TEXT.shortcutLongPress}</option>
                    </select>
                </label>
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
                <section class="ttaw-world-info-storage">
                    <h4>${TEXT.worldInfoStorageTitle}</h4>
                    <p>${TEXT.worldInfoStorageHelp}</p>
                    <label class="checkbox_label">
                        <input type="checkbox" data-ttaw-world-info-storage-enabled>
                        <span>${TEXT.worldInfoStorageEnabled}</span>
                    </label>
                    <label class="ttaw-extension-field" for="ttaw-world-info-book">
                        <span>${TEXT.worldInfoBook}</span>
                        <select id="ttaw-world-info-book" class="text_pole" data-ttaw-world-info-book></select>
                    </label>
                    <label class="ttaw-extension-field" for="ttaw-world-info-params-path">
                        <span>${TEXT.worldInfoParamsPath}</span>
                        <input id="ttaw-world-info-params-path" type="text" class="text_pole" data-ttaw-world-info-params-path placeholder="${DEFAULT_WORLD_INFO_PARAMS_PATH}">
                    </label>
                    <label class="ttaw-extension-field" for="ttaw-world-info-retention-layers">
                        <span>${TEXT.worldInfoRetentionLayers}</span>
                        <input id="ttaw-world-info-retention-layers" type="number" class="text_pole" min="0" step="1" data-ttaw-world-info-retention-layers>
                    </label>
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
    preAgentAutomaticInput = panel.querySelector('[data-ttaw-pre-agent-automatic]');
    preAgentShortcutSelect = panel.querySelector('[data-ttaw-pre-agent-shortcut]');
    preAgentProfileSelect = panel.querySelector('[data-ttaw-pre-agent-profile]');
    preAgentPresentationInputs = Array.from(panel.querySelectorAll('[data-ttaw-pre-agent-presentation]'));
    postAgentEnabledInput = panel.querySelector('[data-ttaw-post-agent-enabled]');
    postAgentAutomaticInput = panel.querySelector('[data-ttaw-post-agent-automatic]');
    postAgentShortcutSelect = panel.querySelector('[data-ttaw-post-agent-shortcut]');
    postAgentProfileSelect = panel.querySelector('[data-ttaw-post-agent-profile]');
    postAgentPresentationInputs = Array.from(panel.querySelectorAll('[data-ttaw-post-agent-presentation]'));
    worldInfoStorageEnabledInput = panel.querySelector('[data-ttaw-world-info-storage-enabled]');
    worldInfoBookSelect = panel.querySelector('[data-ttaw-world-info-book]');
    worldInfoParamsPathInput = panel.querySelector('[data-ttaw-world-info-params-path]');
    worldInfoRetentionLayersInput = panel.querySelector('[data-ttaw-world-info-retention-layers]');
    tabs = Array.from(panel.querySelectorAll('[data-ttaw-tab]'));
    tabPanels = Array.from(panel.querySelectorAll('[data-ttaw-panel]'));

    bubble.addEventListener('click', (event) => {
        if (bubble.dataset.dragged === '1' || bubble.dataset.longPressed === '1') {
            event.preventDefault();
            bubble.dataset.dragged = '0';
            bubble.dataset.longPressed = '0';
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
                void refreshWorldInfoNames();
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
        void triggerBubbleShortcut('double_click');
    });
    bubble.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearTimeout(bubbleClickTimer);
        bubbleClickTimer = null;
        if (bubble.dataset.dragged === '1') {
            bubble.dataset.dragged = '0';
            return;
        }
        void triggerBubbleShortcut('right_click');
    });
    installBubbleLongPress();

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
    preAgentAutomaticInput?.addEventListener('input', () => {
        void saveSettings({ preAgentAutomatic: preAgentAutomaticInput.checked });
    });
    preAgentShortcutSelect?.addEventListener('change', () => {
        void saveSettings({ preAgentShortcut: preAgentShortcutSelect.value });
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
    postAgentShortcutSelect?.addEventListener('change', () => {
        void saveSettings({ postAgentShortcut: postAgentShortcutSelect.value });
    });
    postAgentProfileSelect?.addEventListener('change', () => {
        void saveSettings({ postAgentProfileId: String(postAgentProfileSelect.value || '').trim() });
    });
    worldInfoStorageEnabledInput?.addEventListener('input', () => {
        void saveSettings({ worldInfoStorageEnabled: worldInfoStorageEnabledInput.checked });
    });
    worldInfoBookSelect?.addEventListener('change', () => {
        void saveSettings({ worldInfoBookName: String(worldInfoBookSelect.value || '').trim() });
    });
    worldInfoParamsPathInput?.addEventListener('change', () => {
        const path = normalizeWorkspacePath(worldInfoParamsPathInput.value || DEFAULT_WORLD_INFO_PARAMS_PATH);
        void saveSettings({ worldInfoParamsPath: path || DEFAULT_WORLD_INFO_PARAMS_PATH });
    });
    worldInfoRetentionLayersInput?.addEventListener('change', () => {
        const value = sanitizeNonNegativeInteger(
            worldInfoRetentionLayersInput.value,
            DEFAULT_WORLD_INFO_RETENTION_LAYERS,
        );
        void saveSettings({ worldInfoRetentionLayers: value });
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

function installBubbleLongPress() {
    let longPressTimer = null;
    const clearLongPress = () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    };

    bubble.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) {
            return;
        }
        const startX = event.clientX;
        const startY = event.clientY;
        clearLongPress();

        const cleanup = () => {
            clearLongPress();
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
        const onMove = (moveEvent) => {
            const delta = Math.abs(moveEvent.clientX - startX) + Math.abs(moveEvent.clientY - startY);
            if (delta > 6) {
                cleanup();
            }
        };
        const onUp = () => cleanup();

        longPressTimer = setTimeout(() => {
            bubble.dataset.longPressed = '1';
            clearTimeout(bubbleClickTimer);
            bubbleClickTimer = null;
            cleanup();
            void triggerBubbleShortcut('long_press');
        }, BUBBLE_LONG_PRESS_MS);

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp, { once: true });
        window.addEventListener('pointercancel', onUp, { once: true });
    });
}

async function triggerBubbleShortcut(shortcut) {
    if (state.settings.preAgentShortcut === shortcut) {
        const started = await startPreAgentWorkflowFromInput();
        if (started) {
            return;
        }
    }
    if (state.settings.postAgentShortcut === shortcut) {
        await startPostAgentWorkflow();
    }
}

async function startPreAgentWorkflowFromInput() {
    if (!state.settings.preAgentEnabled) {
        return false;
    }
    const textarea = document.querySelector('#send_textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) {
        return false;
    }
    const message = String(textarea.value || '');
    if (!message.trim()) {
        window.toastr?.warning?.(TEXT.preAgentMessageRequired);
        return false;
    }
    if (message.trimStart().startsWith('/')) {
        return false;
    }
    if (!String(state.settings.preAgentProfileId || '').trim()) {
        window.toastr?.warning?.(TEXT.profileRequired);
        return false;
    }
    if (isPreAgentWorkflowBusy() || isPostAgentWorkflowBusy() || getActiveAgentRun()?.runId) {
        window.toastr?.warning?.(TEXT.workflowActive);
        return false;
    }

    textarea.value = '';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    try {
        await startPreAgentWorkflow(message, { autoSend: false });
        return true;
    } catch (error) {
        console.error('[AgentWorkspaceFloat] Failed to start pre Agent from shortcut:', error);
        textarea.value = message;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        window.toastr?.error?.(String(error?.message || error));
        return false;
    }
}

async function updateFontSize(value) {
    const fontSize = Math.min(Math.max(Number(value) || DEFAULT_SETTINGS.fontSize, 11), 24);
    await saveSettings({ fontSize });
    render();
}

async function preAgentGenerateInterceptor(_chat, _contextSize, abort, type) {
    if (state.preAgentBypass
        || !state.settings.preAgentEnabled
        || !state.settings.preAgentAutomatic
        || type !== 'normal') {
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
    await startPreAgentWorkflow(String(message.mes || ''), { autoSend: true });
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

async function startPreAgentWorkflow(originalMessage, options = {}) {
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
    state.preAgentAutoSend = options.autoSend !== false;
    state.preAgentPersistTargetMessageId = findLatestAssistantMessageId(chat);
    state.preAgentPersistWritePromise = Promise.resolve();
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
            capturePersistentStateFromEvent('pre', event);
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
    const persistWritePromise = state.preAgentPersistWritePromise;
    state.preAgentUnsubscribe = null;
    state.preAgentStopping = false;
    state.preAgentPhase = workflowPhaseForTerminalEvent(terminalEventType);
    unsubscribe?.();
    render();

    await persistWritePromise;
    state.preAgentRunId = '';
    state.activeRunId = '';
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
        state.preAgentOriginalMessage = '';
        state.preAgentAutoSend = false;
        state.preAgentPersistTargetMessageId = null;
        state.preAgentPersistWritePromise = Promise.resolve();
        window.toastr?.warning?.(TEXT.preAgentMessageChanged);
        render();
        return;
    }

    const combined = [
        state.preAgentOriginalMessage,
        ...contents,
    ].map((part) => String(part || '').trim()).filter(Boolean).join('\n\n');
    const autoSend = state.preAgentAutoSend;
    state.preAgentIntercepting = false;
    state.preAgentChat = null;
    state.preAgentOriginalMessage = '';
    state.preAgentAutoSend = false;
    state.preAgentPersistTargetMessageId = null;
    state.preAgentPersistWritePromise = Promise.resolve();
    render();
    setTimeout(() => void resumeInterceptedUserMessage(combined, { autoSend }), 0);
}

async function resumeInterceptedUserMessage(message, options = {}) {
    const textarea = document.querySelector('#send_textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) {
        window.toastr?.error?.(TEXT.preAgentResumeFailed);
        return;
    }
    const draft = String(textarea.value || '');
    textarea.value = message;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    if (options.autoSend === false) {
        if (draft) {
            textarea.value = [message, draft].filter(Boolean).join('\n\n');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return;
    }
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
            || !state.settings.preAgentAutomatic
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
        void startPreAgentWorkflow(message, { autoSend: true }).catch((error) => {
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
    const context = getContext();
    const chat = context?.chat;
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
    state.workflowChat = chat;
    state.workflowPersistTargetMessageId = findLatestAssistantMessageId(chat);
    state.workflowPersistWritePromise = Promise.resolve();
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
            capturePersistentStateFromEvent('post', event);
            queueProfileOutputDocuments(runId, event);
            if (TERMINAL_RUN_EVENTS.has(event?.type)) {
                void finishPostAgentWorkflow(runId, event.type);
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

function findLatestAssistantMessageId(chat) {
    if (!Array.isArray(chat)) {
        return null;
    }
    for (let index = chat.length - 1; index >= 0; index -= 1) {
        if (isAssistantChatMessage(chat[index])) {
            return index;
        }
    }
    return null;
}

function isAssistantChatMessage(message) {
    return Boolean(message && typeof message === 'object' && !message.is_user && !message.is_system);
}

function capturePersistentStateFromEvent(kind, event) {
    if (event?.type !== 'persistent_changes_committed') {
        return;
    }

    const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
    const persistStateId = String(payload.stateId || '').trim();
    if (!persistStateId) {
        return;
    }

    const isPreAgent = kind === 'pre';
    const runId = String(event.runId || payload.runId || '').trim();
    const expectedRunId = isPreAgent ? state.preAgentRunId : state.workflowRunId;
    if (!runId || runId !== expectedRunId) {
        return;
    }

    const targetMessageId = isPreAgent
        ? state.preAgentPersistTargetMessageId
        : state.workflowPersistTargetMessageId;
    const expectedChat = isPreAgent ? state.preAgentChat : state.workflowChat;
    const profileId = isPreAgent
        ? state.preAgentProfileId || state.preAgentRootProfileId
        : state.workflowProfileId || state.workflowRootProfileId;

    const writePromise = writePersistentStateMetadataToAssistantMessage({
        expectedChat,
        messageId: targetMessageId,
        runId,
        profileId,
        persistStateId,
        persistBaseStateId: String(payload.baseStateId || '').trim() || null,
        persistChangeCount: Number(payload.changeCount ?? 0),
    }).catch((error) => {
        console.error('[AgentWorkspaceFloat] Failed to write persistent state metadata:', error);
    });
    if (isPreAgent) {
        state.preAgentPersistWritePromise = writePromise;
    } else {
        state.workflowPersistWritePromise = writePromise;
    }
}

async function writePersistentStateMetadataToAssistantMessage({
    expectedChat,
    messageId,
    runId,
    profileId,
    persistStateId,
    persistBaseStateId,
    persistChangeCount,
}) {
    if (!Number.isInteger(messageId) || messageId < 0 || !persistStateId) {
        return false;
    }

    const context = getContext();
    const chat = context?.chat;
    if (!Array.isArray(chat) || (expectedChat && chat !== expectedChat) || messageId >= chat.length) {
        return false;
    }

    const message = chat[messageId];
    if (!isAssistantChatMessage(message)) {
        return false;
    }

    const previousExtra = message.extra && typeof message.extra === 'object' ? message.extra : {};
    const previousTauriTavern = previousExtra.tauritavern && typeof previousExtra.tauritavern === 'object'
        ? previousExtra.tauritavern
        : {};
    const previousAgent = previousTauriTavern.agent && typeof previousTauriTavern.agent === 'object'
        ? previousTauriTavern.agent
        : {};
    const changeCount = Number.isFinite(persistChangeCount) ? Math.max(0, Math.trunc(persistChangeCount)) : 0;

    message.extra = {
        ...previousExtra,
        tauritavern: {
            ...previousTauriTavern,
            agent: {
                ...previousAgent,
                version: previousAgent.version ?? 2,
                persistStateId,
                persistBaseStateId,
                persistStateStatus: 'committed',
                persistChangeCount: changeCount,
                extensionPersistSource: {
                    module: MODULE_NAME,
                    runId,
                    profileId: String(profileId || '').trim() || null,
                },
            },
        },
    };

    const swipeId = Number(message.swipe_id);
    if (Array.isArray(message.swipe_info)
        && Number.isInteger(swipeId)
        && swipeId >= 0
        && message.swipe_info[swipeId]) {
        message.swipe_info[swipeId].extra = structuredClone(message.extra);
    }

    if (context.chatMetadata && typeof context.chatMetadata === 'object') {
        context.chatMetadata.tainted = true;
    }
    markLegacyWindowedChatDirtyFromIndex(messageId);
    context.updateMessageBlock?.(messageId, message);
    const messageUpdatedEvent = context.eventTypes?.MESSAGE_UPDATED;
    if (messageUpdatedEvent && typeof context.eventSource?.emit === 'function') {
        await context.eventSource.emit(messageUpdatedEvent, messageId);
    }
    await context.saveChat?.();
    return true;
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

async function storeWorldInfoEntriesFromRun(runId) {
    if (!state.settings.worldInfoStorageEnabled) {
        return;
    }
    const worldName = String(state.settings.worldInfoBookName || '').trim();
    const paramsPath = normalizeWorkspacePath(state.settings.worldInfoParamsPath || DEFAULT_WORLD_INFO_PARAMS_PATH);
    if (!worldName) {
        window.toastr?.warning?.(TEXT.worldInfoBookRequired);
        return;
    }
    if (!paramsPath) {
        return;
    }

    const paramsFile = await agentApi().readWorkspaceFile({ runId, path: paramsPath });
    const records = parseWorldInfoJsonl(String(paramsFile?.text || ''));
    if (records.length === 0) {
        return;
    }

    const data = await loadWorldInfo(worldName);
    if (!data || !data.entries || typeof data.entries !== 'object') {
        throw new Error(`World Info "${worldName}" is unavailable.`);
    }

    const currentPosition = currentChatFloorSwipeInfo();
    const identifier = currentPosition.identifier;
    let created = 0;
    for (const record of records) {
        const documentPath = normalizeWorkspacePath(record.documentPath);
        if (!documentPath) {
            continue;
        }

        let content = '';
        try {
            const documentFile = await agentApi().readWorkspaceFile({ runId, path: documentPath });
            content = String(documentFile?.text || '');
        } catch (error) {
            console.warn(`[AgentWorkspaceFloat] World Info source document is unavailable: ${documentPath}`, error);
            continue;
        }

        const entry = createWorldInfoEntry(worldName, data);
        if (!entry) {
            continue;
        }
        const entryName = `${documentFileName(documentPath)}\u3010${identifier}\u3011 `;
        entry.comment = entryName;
        entry.addMemo = true;
        entry.content = content;
        applyWorldInfoEntryParams(entry, record.params);
        created += 1;
    }

    if (created === 0) {
        return;
    }

    const cleanupResult = await cleanupWorldInfoEntriesByRetention(data, worldName, currentPosition.floorId);
    if (cleanupResult === 'cancelled') {
        await saveWorldInfo(worldName, data, true);
        reloadEditor(worldName, false);
        window.toastr?.success?.(`${TEXT.worldInfoStored}: ${created}`);
        return;
    }

    await saveWorldInfo(worldName, data, true);
    reloadEditor(worldName, false);
    window.toastr?.success?.(`${TEXT.worldInfoStored}: ${created}`);
}

async function cleanupWorldInfoEntriesByRetention(data, worldName, currentFloorId) {
    const retentionLayers = sanitizeNonNegativeInteger(
        state.settings.worldInfoRetentionLayers,
        DEFAULT_WORLD_INFO_RETENTION_LAYERS,
    );
    const minFloorId = currentFloorId - retentionLayers;
    const entries = Object.entries(data.entries || {});
    const recognized = entries
        .map(([uid, entry]) => ({
            uid,
            entry,
            floorId: worldInfoEntryFloorId(entry),
        }))
        .filter((item) => Number.isInteger(item.floorId));
    const deleting = recognized.filter((item) => item.floorId < minFloorId || item.floorId > currentFloorId);
    if (deleting.length === 0) {
        return 'unchanged';
    }

    if (deleting.length > 5) {
        const action = await confirmWorldInfoCleanupWithOptionalBackup({
            worldName,
            data,
            deleteCount: deleting.length,
            currentFloorId,
            retentionLayers,
        });
        if (action === 'cancelled') {
            return 'cancelled';
        }
    }

    for (const item of deleting) {
        delete data.entries[item.uid];
    }
    return 'deleted';
}

function worldInfoEntryFloorId(entry) {
    const name = String(entry?.comment || '');
    const match = name.match(/\u3010(\d+)-\d+\u3011/);
    if (!match) {
        return null;
    }
    const floorId = Number(match[1]);
    return Number.isInteger(floorId) ? floorId : null;
}

async function confirmWorldInfoCleanupWithOptionalBackup({
    worldName,
    data,
    deleteCount,
    currentFloorId,
    retentionLayers,
}) {
    const message = [
        TEXT.worldInfoCleanupConfirm,
        '',
        `\u4e16\u754c\u4e66\uff1a${worldName}`,
        `\u5f53\u524d\u5c42\u53f7\uff1a${currentFloorId}`,
        `\u4fdd\u7559\u5c42\u6570\uff1a${retentionLayers}`,
        `\u5c06\u5220\u9664\u6761\u76ee\uff1a${deleteCount}`,
    ].join('<br>');
    const result = await Popup.show.confirm(TEXT.worldInfoCleanupTitle, message, {
        okButton: TEXT.worldInfoCleanupDirect,
        cancelButton: TEXT.worldInfoCleanupCancel,
        customButtons: [{
            text: TEXT.worldInfoCleanupBackup,
            result: POPUP_RESULT.CUSTOM1,
            icon: 'fa-copy',
            appendAtEnd: true,
        }],
    });

    if (result === POPUP_RESULT.CUSTOM1) {
        const backupName = await backupWorldInfoBeforeCleanup(worldName, data);
        window.toastr?.success?.(`${TEXT.worldInfoBackupCreated}: ${backupName}`);
        return 'backup';
    }
    if (result === POPUP_RESULT.AFFIRMATIVE) {
        return 'delete';
    }
    return 'cancelled';
}

async function backupWorldInfoBeforeCleanup(worldName, data) {
    const backupName = uniqueWorldInfoBackupName(worldName);
    await saveWorldInfo(backupName, structuredClone(data), true);
    await refreshWorldInfoNames();
    return backupName;
}

function uniqueWorldInfoBackupName(worldName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `${worldName}-backup-${timestamp}`;
    const names = new Set([
        ...(Array.isArray(world_names) ? world_names : []),
        ...state.worldInfoNames,
    ]);
    if (!names.has(baseName)) {
        return baseName;
    }
    let index = 2;
    while (names.has(`${baseName}-${index}`)) {
        index += 1;
    }
    return `${baseName}-${index}`;
}

function parseWorldInfoJsonl(text) {
    const records = [];
    const lines = String(text || '').split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index].trim();
        if (!line) {
            continue;
        }
        try {
            const value = JSON.parse(line);
            const record = normalizeWorldInfoRecord(value);
            if (record) {
                records.push(record);
            }
        } catch (error) {
            console.warn(`[AgentWorkspaceFloat] Invalid World Info JSONL line ${index + 1}:`, error);
        }
    }
    return records;
}

function normalizeWorldInfoRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const pathKeys = ['\u6587\u6863\u8def\u5f84', 'documentPath', 'document_path', 'docPath', 'doc_path', 'filePath', 'file_path', 'path'];
    const documentPath = firstRecordValue(value, pathKeys);
    const nestedParams = value.params || value.parameters || value['\u53c2\u6570'];
    const params = {};

    if (nestedParams && typeof nestedParams === 'object' && !Array.isArray(nestedParams)) {
        Object.assign(params, nestedParams);
    }
    const ignored = new Set([
        ...pathKeys,
        'params',
        'parameters',
        '\u53c2\u6570',
        'name',
        'entryName',
        'comment',
        '\u6761\u76ee\u540d\u79f0',
        'content',
        '\u5185\u5bb9',
    ]);
    for (const [key, fieldValue] of Object.entries(value)) {
        if (!ignored.has(key)) {
            params[key] = fieldValue;
        }
    }

    return {
        documentPath: String(documentPath || '').trim(),
        params,
    };
}

function currentChatFloorSwipeInfo() {
    const chat = getContext()?.chat;
    if (!Array.isArray(chat) || chat.length === 0) {
        return { floorId: 0, swipeId: 0, identifier: '0-0' };
    }
    const floorId = chat.length - 1;
    const latestMessage = chat[floorId];
    const swipeId = Number(latestMessage?.swipe_id);
    const normalizedSwipeId = Number.isInteger(swipeId) && swipeId >= 0 ? swipeId : 0;
    return {
        floorId,
        swipeId: normalizedSwipeId,
        identifier: `${floorId}-${normalizedSwipeId}`,
    };
}

function firstRecordValue(record, keys) {
    for (const key of keys) {
        if (record[key] != null) {
            return record[key];
        }
    }
    return '';
}

function applyWorldInfoEntryParams(entry, params) {
    if (!params || typeof params !== 'object') {
        return;
    }
    for (const [rawKey, rawValue] of Object.entries(params)) {
        const key = normalizeWorldInfoParamKey(rawKey);
        if (!key || key === 'comment' || key === 'content' || key === 'uid') {
            continue;
        }
        if (key === 'characterFilterNames' || key === 'characterFilterTags' || key === 'characterFilterExclude') {
            applyCharacterFilterParam(entry, key, rawValue);
            continue;
        }
        if (key === 'enabled') {
            entry.disable = !parseBooleanLike(rawValue, true);
            continue;
        }
        const definition = newWorldInfoEntryDefinition[key];
        if (!definition || definition.excludeFromTemplate) {
            continue;
        }
        entry[key] = coerceWorldInfoParamValue(key, rawValue, definition);
    }
}

function normalizeWorldInfoParamKey(key) {
    const aliases = {
        '\u89e6\u53d1\u8bcd': 'key',
        '\u4e3b\u89e6\u53d1\u8bcd': 'key',
        keys: 'key',
        primaryKeys: 'key',
        '\u6b21\u7ea7\u89e6\u53d1\u8bcd': 'keysecondary',
        '\u9644\u52a0\u89e6\u53d1\u8bcd': 'keysecondary',
        secondaryKeys: 'keysecondary',
        keySecondary: 'keysecondary',
        enabled: 'enabled',
        '\u542f\u7528': 'enabled',
        '\u5e38\u9a7b': 'constant',
        '\u7eff\u706f': 'constant',
        '\u5411\u91cf\u5316': 'vectorized',
        '\u84dd\u706f': 'vectorized',
        '\u7981\u7528': 'disable',
        '\u987a\u5e8f': 'order',
        '\u4f4d\u7f6e': 'position',
        '\u6982\u7387': 'probability',
        '\u4f7f\u7528\u6982\u7387': 'useProbability',
        '\u5206\u7ec4': 'group',
        '\u5206\u7ec4\u6743\u91cd': 'groupWeight',
        '\u626b\u63cf\u6df1\u5ea6': 'scanDepth',
        '\u533a\u5206\u5927\u5c0f\u5199': 'caseSensitive',
        '\u5168\u8bcd\u5339\u914d': 'matchWholeWords',
        '\u89d2\u8272\u8fc7\u6ee4': 'characterFilterNames',
        '\u89d2\u8272\u6807\u7b7e\u8fc7\u6ee4': 'characterFilterTags',
        '\u6392\u9664\u89d2\u8272\u8fc7\u6ee4': 'characterFilterExclude',
    };
    return aliases[key] || key;
}

function coerceWorldInfoParamValue(key, value, definition) {
    if (key === 'position') {
        return normalizeWorldInfoPosition(value);
    }
    if (definition.type === 'array') {
        const values = Array.isArray(value)
            ? value
            : String(value || '').split(/[,，]/);
        return values.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (definition.type === 'boolean' || definition.type === 'boolean?') {
        if (value === null && definition.type === 'boolean?') {
            return null;
        }
        return parseBooleanLike(value, Boolean(definition.default));
    }
    if (definition.type === 'number' || definition.type === 'number?' || definition.type === 'enum') {
        if ((value === null || value === '') && definition.type === 'number?') {
            return null;
        }
        const number = Number(value);
        return Number.isFinite(number) ? number : definition.default;
    }
    return String(value ?? definition.default ?? '');
}

function normalizeWorldInfoPosition(value) {
    const positions = {
        before: 0,
        before_char: 0,
        '\u89d2\u8272\u524d': 0,
        after: 1,
        after_char: 1,
        '\u89d2\u8272\u540e': 1,
        an_top: 2,
        '\u4f5c\u8005\u6ce8\u91ca\u9876\u90e8': 2,
        an_bottom: 3,
        '\u4f5c\u8005\u6ce8\u91ca\u5e95\u90e8': 3,
        depth: 4,
        at_depth: 4,
        '\u6df1\u5ea6': 4,
        em_top: 5,
        '\u793a\u4f8b\u9876\u90e8': 5,
        em_bottom: 6,
        '\u793a\u4f8b\u5e95\u90e8': 6,
        outlet: 7,
    };
    const normalized = String(value ?? '').trim().toLowerCase();
    if (Object.hasOwn(positions, normalized)) {
        return positions[normalized];
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function parseBooleanLike(value, fallback = false) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    const normalized = String(value ?? '').trim().toLowerCase();
    if (['true', '1', 'yes', 'on', '\u662f', '\u5f00', '\u542f\u7528'].includes(normalized)) {
        return true;
    }
    if (['false', '0', 'no', 'off', '\u5426', '\u5173', '\u7981\u7528'].includes(normalized)) {
        return false;
    }
    return fallback;
}

function applyCharacterFilterParam(entry, key, value) {
    entry.characterFilter ||= {
        isExclude: false,
        names: [],
        tags: [],
    };
    if (key === 'characterFilterNames') {
        entry.characterFilter.names = Array.isArray(value)
            ? value.map((item) => String(item || '').trim()).filter(Boolean)
            : String(value || '').split(/[,，]/).map((item) => item.trim()).filter(Boolean);
    } else if (key === 'characterFilterTags') {
        entry.characterFilter.tags = Array.isArray(value)
            ? value.map((item) => String(item || '').trim()).filter(Boolean)
            : String(value || '').split(/[,，]/).map((item) => item.trim()).filter(Boolean);
    } else if (key === 'characterFilterExclude') {
        entry.characterFilter.isExclude = parseBooleanLike(value, false);
    }
}

function documentFileName(path) {
    const normalized = normalizeWorkspacePath(path);
    const filename = normalized.split('/').filter(Boolean).pop() || normalized || 'document';
    return filename.replace(/\.[^/.]+$/, '') || filename;
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
    markLegacyWindowedChatDirtyFromIndex(messageId);
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

async function finishPostAgentWorkflow(runId, terminalEventType = '') {
    if (runId !== state.workflowRunId) {
        return;
    }
    const unsubscribe = state.workflowUnsubscribe;
    const persistWritePromise = state.workflowPersistWritePromise;
    state.workflowUnsubscribe = null;
    state.workflowStopping = false;
    state.workflowPhase = workflowPhaseForTerminalEvent(terminalEventType);
    unsubscribe?.();
    render();

    await persistWritePromise;
    state.workflowRunId = '';
    state.activeRunId = '';
    state.workflowChat = null;
    state.workflowPersistTargetMessageId = null;
    state.workflowPersistWritePromise = Promise.resolve();
    render();

    void storeWorldInfoEntriesFromRun(runId).catch((error) => {
        console.error('[AgentWorkspaceFloat] Failed to store World Info entries:', error);
        window.toastr?.error?.(`${TEXT.worldInfoStoreFailed} ${String(error?.message || error)}`);
    });
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
    await refreshWorldInfoNames();
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
