import React, { useState, useEffect, useCallback } from 'react';
import { Key, Globe, Save, CheckCircle, AlertCircle, Eye, EyeOff, Brain, Database } from 'lucide-react';
import type { ReactNode } from 'react';

const api = (window as any).api;

interface AIConfig {
  provider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
}

interface RagConfig {
  embedApiUrl: string;
  embedApiKey: string;
  embedModel: string;
  rerankerModel: string;
  llmApiUrl: string;
  llmApiKey: string;
  llmModel: string;
}

interface ProviderOption {
  name: string;
  url: string;
  model: string;
}

interface SelectOption {
  value: string;
  label: string;
}

const AI_PROVIDERS: ProviderOption[] = [
  { name: 'DeepSeek', url: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: '硅基流动', url: 'https://api.siliconflow.cn', model: 'Qwen/Qwen2.5-72B-Instruct' },
  { name: 'OpenAI', url: 'https://api.openai.com', model: 'gpt-4o-mini' },
  { name: '智谱AI', url: 'https://open.bigmodel.cn', model: 'glm-4-flash' },
  { name: '月之暗面', url: 'https://api.moonshot.cn', model: 'moonshot-v1-8k' },
  { name: '自定义', url: '', model: '' },
];

/* ─── Sub-components ─── */

interface FormInputProps {
  label: ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}

const FormInput: React.FC<FormInputProps> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full px-3.5 py-2.5 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 placeholder:text-surface-400 dark:text-surface-0"
      placeholder={placeholder}
    />
  </div>
);

const FormSelect: React.FC<{ label: ReactNode; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: SelectOption[] }> = ({ label, value, onChange, options }) => (
  <div>
    <label className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const TestResultBanner: React.FC<{ result: 'success' | 'error' }> = ({ result }) => (
  <div className={`flex items-center gap-2 p-3 rounded-lg ${result === 'success' ? 'bg-success-light dark:bg-success/10 text-success-dark dark:text-success' : 'bg-danger-light dark:bg-danger/10 text-danger-dark dark:text-danger'}`}>
    {result === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
    <span className="text-sm">{result === 'success' ? '连接成功！API 配置正确' : '连接失败，请检查配置'}</span>
  </div>
);

/* ─── Main Page ─── */

const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'DeepSeek',
    apiUrl: AI_PROVIDERS[0].url,
    apiKey: '',
    model: AI_PROVIDERS[0].model,
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [appVersion, setAppVersion] = useState('');

  // Load config from both sources
  useEffect(() => {
    const loadConfig = async () => {
      // 1. Try rag_config.json (main process, authoritative source)
      try {
        const ragConfig: RagConfig = await api.rag.configGet();
        if (ragConfig?.llmApiUrl && ragConfig?.llmApiKey) {
          // Find matching provider
          const provider = AI_PROVIDERS.find(p =>
            ragConfig.llmApiUrl.includes(p.url.replace('https://', '').replace('http://', ''))
          );
          setConfig({
            provider: provider?.name || '自定义',
            apiUrl: ragConfig.llmApiUrl,
            apiKey: ragConfig.llmApiKey,
            model: ragConfig.llmModel || '',
          });
          return;
        }
      } catch {}

      // 2. Fallback to localStorage
      try {
        const savedStr = localStorage.getItem('ai_config');
        if (savedStr) {
          setConfig(JSON.parse(savedStr) as AIConfig);
        }
      } catch {}
    };

    loadConfig();

    // Load app version
    const w = window as any;
    if (w.api?.getAppVersion) {
      w.api.getAppVersion().then((v: string) => setAppVersion(v)).catch(() => {});
    }
  }, []);

  const handleProviderChange = useCallback((providerName: string) => {
    const provider = AI_PROVIDERS.find((p) => p.name === providerName);
    if (provider) {
      setConfig((prev) => ({
        ...prev,
        provider: providerName,
        apiUrl: provider.url || prev.apiUrl,
        model: provider.model || prev.model,
      }));
    }
  }, []);

  // Save to both rag_config.json AND localStorage
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // 1. Save to rag_config.json (main process uses this)
      const ragConfig: RagConfig = {
        embedApiUrl: config.apiUrl,
        embedApiKey: config.apiKey,
        embedModel: '',
        rerankerModel: '',
        llmApiUrl: config.apiUrl,
        llmApiKey: config.apiKey,
        llmModel: config.model,
      };
      await api.rag.configSet(ragConfig);

      // 2. Save to localStorage (backward compat)
      localStorage.setItem('ai_config', JSON.stringify(config));

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('保存配置失败', e);
    } finally {
      setSaving(false);
    }
  }, [config]);

  const handleTest = useCallback(async () => {
    if (!config.apiKey || !config.apiUrl) {
      setTestResult('error');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await api.rag.configTest({
        apiUrl: config.apiUrl,
        apiKey: config.apiKey,
        model: config.model,
      });
      setTestResult(result.success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  }, [config]);

  const providerOptions: SelectOption[] = AI_PROVIDERS.map((p) => ({
    value: p.name,
    label: p.name,
  }));

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-0 font-display">设置</h1>
          <p className="text-sm text-surface-400 mt-1">统一配置 AI 模型，所有功能共用</p>
        </div>
        {appVersion && (
          <span className="text-xs text-surface-400 bg-surface-50 dark:bg-surface-800 px-2 py-1 rounded-md">v{appVersion}</span>
        )}
      </div>

      {/* AI 模型配置 */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-0 font-display">AI 模型配置</h2>
          <span className="text-xs text-surface-400 dark:text-surface-400 ml-auto">全局生效：套题测评、申论批改、知识图谱、PDF题目提取</span>
        </div>

        <FormSelect
          label="服务商"
          value={config.provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          options={providerOptions}
        />

        <FormInput
          label={<><Globe className="w-4 h-4 inline mr-1" />API 地址</>}
          value={config.apiUrl}
          onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
          placeholder="https://api.deepseek.com"
        />

        <div>
          <label className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">
            <Key className="w-4 h-4 inline mr-1" />
            API 密钥
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="w-full px-3.5 py-2.5 pr-10 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 placeholder:text-surface-400 dark:text-surface-0"
              placeholder="sk-xxxxxxxxxxxxxxxx"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-surface-400 mt-1">密钥仅保存在本地，不会上传服务器</p>
        </div>

        <FormInput
          label="模型名称"
          value={config.model}
          onChange={(e) => setConfig({ ...config, model: e.target.value })}
          placeholder="deepseek-chat"
        />

        {testResult && <TestResultBanner result={testResult} />}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleTest}
            disabled={testing || !config.apiKey || !config.apiUrl}
            className="flex items-center gap-2 px-4 py-2 border border-surface-200 dark:border-surface-600 rounded-lg text-sm hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-50 dark:text-surface-0"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saved ? '已保存 ✓' : '保存配置'}
          </button>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-3">使用说明</h3>
        <ol className="text-sm text-surface-600 dark:text-surface-400 space-y-2 list-decimal list-inside">
          <li>选择 AI 服务商（推荐 DeepSeek 或硅基流动）</li>
          <li>从对应平台控制台获取 API 密钥并填入</li>
          <li>点击「测试连接」验证配置是否正确</li>
          <li>点击「保存配置」，配置将自动同步到所有 AI 功能</li>
        </ol>
      </div>

      {/* 推荐服务商 */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5">
        <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-3">推荐服务商</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="shrink-0 px-2 py-0.5 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded text-xs font-medium">推荐</span>
            <div>
              <p className="font-medium text-surface-800 dark:text-surface-200">DeepSeek</p>
              <p className="text-surface-500 dark:text-surface-400 text-xs">国产大模型，中文理解好，性价比极高。注册地址：platform.deepseek.com</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 px-2 py-0.5 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 rounded text-xs font-medium">备选</span>
            <div>
              <p className="font-medium text-surface-800 dark:text-surface-200">硅基流动</p>
              <p className="text-surface-500 dark:text-surface-400 text-xs">国内访问快，支持多种开源模型。注册地址：siliconflow.cn</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 px-2 py-0.5 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 rounded text-xs font-medium">备选</span>
            <div>
              <p className="font-medium text-surface-800 dark:text-surface-200">智谱 AI</p>
              <p className="text-surface-500 dark:text-surface-400 text-xs">清华技术，GLM 系列模型。注册地址：open.bigmodel.cn</p>
            </div>
          </div>
        </div>
      </div>

      {/* 数据管理 */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-5 h-5 text-brand-500" />
          <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">数据管理</h3>
        </div>
        <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">导出或导入所有学习数据（题目、错题、卡片、计划等）</p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              try {
                const result = await api.data.export();
                if (result?.success) {
                  alert('数据导出成功');
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-4 py-2 border border-surface-200 dark:border-surface-600 rounded-lg text-sm hover:bg-surface-50 dark:hover:bg-surface-700 dark:text-surface-0"
          >
            导出全部数据
          </button>
          <button
            onClick={async () => {
              if (!confirm('导入数据将覆盖当前所有数据，确定继续？')) return;
              try {
                const result = await api.data.import();
                if (result?.success) {
                  alert('数据导入成功');
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-4 py-2 border border-surface-200 dark:border-surface-600 rounded-lg text-sm hover:bg-surface-50 dark:hover:bg-surface-700 dark:text-surface-0"
          >
            导入数据
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
