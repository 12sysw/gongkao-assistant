import React, { useState, useEffect, useCallback } from 'react';
import { Key, Globe, Cpu, Save, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { ReactNode } from 'react';

interface AIConfig {
  provider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
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
  { name: '硅基流动', url: 'https://api.siliconflow.cn/v1/chat/completions', model: 'Qwen/Qwen2.5-72B-Instruct' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  { name: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  { name: '智谱AI', url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
  { name: '月之暗面', url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
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
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
      placeholder={placeholder}
    />
  </div>
);

interface FormSelectProps {
  label: ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
}

const FormSelect: React.FC<FormSelectProps> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const TestResultBanner: React.FC<{ result: 'success' | 'error' }> = ({ result }) => (
  <div className={`flex items-center gap-2 p-3 rounded-lg ${result === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
    {result === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
    <span className="text-sm">{result === 'success' ? '连接成功！API配置正确' : '连接失败，请检查配置'}</span>
  </div>
);

const ApiKeyInput: React.FC<{
  value: string;
  showKey: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void;
}> = ({ value, showKey, onChange, onToggle }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      <Key className="w-4 h-4 inline mr-1" />
      API密钥
    </label>
    <div className="relative">
      <input
        type={showKey ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
        placeholder="sk-xxxxxxxxxxxxxxxx"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
    <p className="text-xs text-gray-400 mt-1">密钥仅保存在本地，不会上传服务器</p>
  </div>
);

const InstructionsCard: React.FC = () => (
  <div className="bg-blue-50 rounded-xl p-4">
    <h3 className="text-sm font-medium text-blue-800 mb-2">使用说明</h3>
    <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
      <li>选择服务商或自定义API地址</li>
      <li>填入你的API密钥（从各平台控制台获取）</li>
      <li>点击测试连接验证配置</li>
      <li>保存后即可在套题测评中使用AI分析</li>
    </ol>
  </div>
);

const RecommendationsCard: React.FC = () => (
  <div className="bg-gray-50 rounded-xl p-4">
    <h3 className="text-sm font-medium text-gray-700 mb-2">推荐服务商</h3>
    <div className="text-xs text-gray-500 space-y-1">
      <p><strong>硅基流动</strong> - 国内访问快，价格便宜，支持多种模型</p>
      <p><strong>DeepSeek</strong> - 国产大模型，中文理解好，性价比高</p>
      <p><strong>智谱AI</strong> - 清华技术，GLM系列模型</p>
    </div>
  </div>
);

/* ─── Main Page ─── */

const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<AIConfig>({
    provider: '硅基流动',
    apiUrl: AI_PROVIDERS[0].url,
    apiKey: '',
    model: AI_PROVIDERS[0].model,
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    try {
      const savedStr = localStorage.getItem('ai_config');
      if (savedStr) {
        setConfig(JSON.parse(savedStr) as AIConfig);
      }
    } catch (e) {
      console.error('加载配置失败', e);
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

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
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
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: '你好，这是一条测试消息，请回复"测试成功"' }],
          max_tokens: 50,
        }),
      });

      setTestResult(response.ok ? 'success' : 'error');
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
      <div>
        <h1 className="text-xl font-bold text-gray-800">设置</h1>
        <p className="text-sm text-gray-500 mt-1">配置AI分析接口</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-primary-500" />
          <h2 className="text-base font-semibold text-gray-800">AI分析配置</h2>
        </div>

        <FormSelect
          label="服务商"
          value={config.provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          options={providerOptions}
        />

        <FormInput
          label={<><Globe className="w-4 h-4 inline mr-1" />API地址</>}
          value={config.apiUrl}
          onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
          placeholder="https://api.example.com/v1/chat/completions"
        />

        <ApiKeyInput
          value={config.apiKey}
          showKey={showKey}
          onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
          onToggle={() => setShowKey((s) => !s)}
        />

        <FormInput
          label="模型"
          value={config.model}
          onChange={(e) => setConfig({ ...config, model: e.target.value })}
          placeholder="model-name"
        />

        {testResult && <TestResultBanner result={testResult} />}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleTest}
            disabled={testing || !config.apiKey || !config.apiUrl}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saved ? '已保存 ✓' : '保存配置'}
          </button>
        </div>
      </div>

      <InstructionsCard />
      <RecommendationsCard />
    </div>
  );
};

export default SettingsPage;
