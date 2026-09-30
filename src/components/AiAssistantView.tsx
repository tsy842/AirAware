import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User as UserIcon, RefreshCw, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { AirQualityData, WeatherData, RiskIntelligenceReport } from '../types';
import { api } from '../services/api';

interface AiAssistantViewProps {
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  airData: AirQualityData | null;
  weatherData: WeatherData | null;
  riskReport: RiskIntelligenceReport | null;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
  model?: string;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  location,
  airData,
  weatherData,
  riskReport,
  initialPrompt,
  onClearInitialPrompt
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your **AirAware Environmental Intelligence Assistant**.\n\nI have synchronized the latest atmospheric chemistry model and weather predictions for **${location.name}** (AQI: ${airData?.current.usAqi ?? 50}, PM2.5: ${airData?.current.pm2_5 ?? 25} µg/m³, Temp: ${weatherData?.current.temperature ?? 28}°C).\n\nAsk me about outdoor cardio & running safety, N95 mask requirements, protecting children or seniors, or home HEPA air filtration!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'gemini-3.8-flash'
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle incoming initial prompt from Dashboard or other views
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSend(initialPrompt.trim());
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const quickPrompts = [
    `Can I go for a run in ${location.name} right now?`,
    `Should I wear an N95 mask outside today?`,
    `Is it safe for children and elderly outdoors?`,
    `How many cigarettes is breathing this air equal to?`,
    `Should I keep windows open or closed today?`,
    `Why is the air quality bad in ${location.name}?`
  ];

  const handleSend = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: questionText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const context = {
      locationName: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      aqi: airData?.current.usAqi,
      pm25: airData?.current.pm2_5,
      pm10: airData?.current.pm10,
      temperature: weatherData?.current.temperature,
      humidity: weatherData?.current.relativeHumidity,
      windSpeed: weatherData?.current.windSpeed,
      weatherCondition: weatherData?.current.weatherCondition,
      riskCategory: riskReport?.overallRisk
    };

    try {
      const res = await api.askAiAssistant(questionText, context);
      const assistantMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: res.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: res.source,
        model: res.model
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: 'I encountered an issue connecting to the AI inference service. Please check your network connection or backend configuration.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-16 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            AI Environmental Intelligence Assistant
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Grounded in active atmospheric chemistry predictions for <strong className="text-slate-200">{location.name}</strong>
          </p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold">
          gemini-3.8-flash
        </span>
      </div>

      {/* Main Chat Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              }`}>
                {msg.sender === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-teal-500 text-slate-950 font-medium rounded-tr-none'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
              }`}>
                <div className="whitespace-pre-line">
                  {msg.text}
                </div>
                <div className={`text-[10px] mt-1.5 flex items-center justify-between gap-4 ${
                  msg.sender === 'user' ? 'text-slate-900/80' : 'text-slate-500'
                }`}>
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'assistant' && msg.model && (
                    <span className="font-mono text-[9px] text-cyan-400/80">
                      Engine: {msg.model}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-[80%]">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
                <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Formulating grounded environmental health explanation...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Prompts Carousel */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 overflow-x-auto flex gap-2">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend(input);
          }}
          className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={`Ask about air quality, running safety, or weather in ${location.name}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* Advisory Disclaimer */}
      <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
        <Info className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>
          <strong>Advisory Note:</strong> AI responses synthesize numerical atmospheric forecasts and public health standards. They do not constitute personalized medical diagnoses. For acute respiratory or cardiac symptoms, contact emergency medical care immediately.
        </span>
      </div>
    </div>
  );
};
