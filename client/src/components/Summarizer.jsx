import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Brain, ListCheck, Clock, BookOpen, Wand2, RefreshCw } from 'lucide-react';

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from',
  'as','is','was','are','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','shall','can','need','its',
  'it','this','that','these','those','i','me','my','we','our','you','your','he',
  'him','his','she','her','they','them','their','what','which','who','whom','when',
  'where','why','how','all','each','every','both','few','more','most','some','any',
  'no','not','only','same','so','than','too','very','just','because','about','if',
  'then','else','also','well','here','there','up','down','out','off','over','under',
  'again','further','once','during','before','after','above','between','through',
  'against','without','within','along','around','ok','okay','yes','no','yeah','yea',
  'hey','hi','hello','thanks','thank','please','sure','right','good','great','nice',
  'cool','oh','ah','wow','hmm','lol','lmfao','lmao','omg','brb','gtg','idk','imo',
  'just','like','really','actually','know','think','going','go','get','got','see',
  'want','let','said','say','says','one','two','way','use','used','make','made',
  'well','even','back','still','also','much','new','now','take','took','come','came',
  'look','first','last','never','always','every','thing','things','people','time'
]);

function tokenize(text) {
  return (text.toLowerCase().match(/\b[a-z]{3,}\b/g) || []).filter(w => !STOP_WORDS.has(w));
}

function extractKeywords(messages, limit = 10) {
  const freq = {};
  messages.forEach(m => {
    tokenize(m.message).forEach(w => {
      freq[w] = (freq[w] || 0) + 1;
    });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function estimateDuration(messages) {
  if (messages.length < 2) return messages.length === 1 ? 'Just Started' : 'N/A';
  const times = messages.map(m => {
    if (m.createdAt) return new Date(m.createdAt).getTime();
    const t = m.time || '';
    const [h, min] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(min)) return null;
    const now = new Date();
    now.setHours(h, min, 0, 0);
    return now.getTime();
  }).filter(t => t !== null);
  if (times.length < 2) return 'N/A';
  const diffMs = Math.max(...times) - Math.min(...times);
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Less than a minute';
  if (mins < 60) return `${mins} Minutes`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs} Hours`;
}

function generateKeyStatements(messages, keywords, limit = 6) {
  const keywordSet = new Set(keywords);
  const scored = messages.map((m, i) => {
    const tokens = tokenize(m.message);
    const score = tokens.filter(t => keywordSet.has(t)).length / Math.max(tokens.length, 1);
    return { index: i, score, text: m.message, username: m.username };
  });
  const top = scored.sort((a, b) => b.score - a.score).slice(0, limit);
  if (top.length === 0) {
    return messages.slice(-limit).map(m => m.message);
  }
  const result = [];
  const seen = new Set();
  top.forEach(s => {
    const short = s.text.length > 100 ? s.text.slice(0, 100) + '...' : s.text;
    if (!seen.has(short)) {
      seen.add(short);
      result.push(s.text);
    }
  });
  return result;
}

function generateSummary(messages) {
  if (!messages || messages.length === 0) {
    return {
      topic: 'No Discussion Yet',
      duration: 'N/A',
      overview: 'No messages have been exchanged in this session yet. Start a conversation and then generate a summary.',
      points: ['Share your thoughts and questions with the group'],
      references: ['Chat messages']
    };
  }

  const keywords = extractKeywords(messages, 8);
  const participants = [...new Set(messages.map(m => m.username))];
  const participantCount = participants.length;
  const duration = estimateDuration(messages);

  const topic = keywords.length >= 3
    ? keywords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', ')
    : 'General Discussion';

  const keywordList = keywords.length > 0 ? keywords.join(', ') : 'various topics';
  const participantStr = participantCount === 1
    ? `${participants[0]} has been studying`
    : `${participantCount} participants (${participants.join(', ')}) have been collaborating`;

  const overview = `${participantStr} in a session focused on ${keywordList}. Over ${messages.length} messages exchanged${duration !== 'N/A' ? ` across ${duration}` : ''}. The discussion covered key concepts around ${topic.toLowerCase()}.`;

  const points = generateKeyStatements(messages, keywords);
  if (points.length === 0) {
    points.push('Active discussion in the study session');
  }

  const references = keywords.length > 0
    ? keywords.slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1))
    : ['Chat discussion'];

  return { topic, duration, overview, points, references };
}

const Summarizer = ({ socket, roomId }) => {
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    const handleReceive = (data) => {
      setMessages(prev => [...prev, {
        username: data.username,
        message: data.message,
        time: data.time,
        createdAt: data.createdAt
      }]);
    };

    const handleHistory = (history) => {
      setMessages(history.map(msg => ({
        username: msg.username,
        message: msg.message,
        time: msg.time,
        createdAt: msg.createdAt
      })));
    };

    socket.on('receive_message', handleReceive);
    socket.on('message_history', handleHistory);
    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('message_history', handleHistory);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [socket]);

  const generateSummaryFn = useCallback(() => {
    setStatus('analyzing');
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const msgs = [...messages];
    let step = 0;
    const totalSteps = 8;
    intervalRef.current = setInterval(() => {
      step++;
      setProgress(Math.round((step / totalSteps) * 100));
      if (step >= totalSteps) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        const result = generateSummary(msgs);
        setSummary(result);
        setStatus('ready');
      }
    }, 200);
  }, [messages]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const renderContent = () => {
    if (status === 'idle') {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{
            width: '80px', height: '80px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
            borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', border: '1px solid rgba(139, 92, 246, 0.3)',
            animation: 'pulse 2s infinite'
          }}>
            <Wand2 size={40} color="#8b5cf6" />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: '#fff' }}>AI Study Companion</h3>
          <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', maxWidth: '280px', margin: '0 auto 32px' }}>
            I'll analyze your chat transcript and shared resources to create a condensed recap of your study session.
          </p>
          <button onClick={generateSummaryFn} style={{
            padding: '14px 28px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
            border: 'none', borderRadius: '14px', color: 'white', fontWeight: '700', fontSize: '15px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto',
            boxShadow: '0 10px 25px rgba(139, 92, 246, 0.4)'
          }}>
            <Sparkles size={18} />
            Analyze Session
          </button>
        </div>
      );
    }

    if (status === 'analyzing') {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 32px' }}>
            <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#8b5cf6" strokeWidth="6"
                strokeDasharray="283" strokeDashoffset={283 - (283 * progress) / 100}
                style={{ transition: 'stroke-dashoffset 0.4s ease' }} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: '800', color: '#fff', fontSize: '18px' }}>
              {progress}%
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <RefreshCw size={16} className="spin" color="#8b5cf6" />
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Analyzing Transcript...
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b' }}>Distilling your hard work into key points.</p>
        </div>
      );
    }

    if (status === 'ready' && summary) {
      return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '20px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Clock size={16} color="#8b5cf6" />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase' }}>Session Length: {summary.duration}</span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px', lineHeight: '1.2' }}>{summary.topic}</h2>
            <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>{summary.overview}</p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ListCheck size={18} color="#10b981" />
              <h4 style={{ fontWeight: '700', color: '#fff' }}>Key Takeaways</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {summary.points.map((pt, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>{pt}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <BookOpen size={18} color="#3b82f6" />
              <h4 style={{ fontWeight: '700', color: '#fff' }}>Resources Noted</h4>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {summary.references.map((ref, i) => (
                <span key={i} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '6px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: '700', border: '1px solid rgba(59, 130, 246, 0.2)' }}>{ref}</span>
              ))}
            </div>
          </div>

          <button onClick={generateSummaryFn} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            Re-generate Summary
          </button>
        </div>
      );
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#0a0a0a', color: '#fff' }}>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .spin { animation: spin 1.5s linear infinite; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', borderRadius: '10px' }}>
            <Sparkles size={18} color="white" />
          </div>
          <span style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '-0.02em' }}>STUDY SUMMARY</span>
        </div>
      </div>
      {renderContent()}
    </div>
  );
};

export default Summarizer;
