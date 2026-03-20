import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Share2, Users, Lock, Terminal, ChevronDown, Code2, Loader2, CheckCircle, XCircle, Trash2 } from 'lucide-react';

const LANGUAGES = [
    { id: 'python', label: 'Python', judge0Id: 71, defaultCode: '# Write your Python code here\ndef solve(n):\n    return n * 2\n\nn = int(input())\nprint(solve(n))\n' },
    { id: 'javascript', label: 'JavaScript', judge0Id: 63, defaultCode: '// Write your JavaScript code here\nconst fs = require("fs");\nconst input = fs.readFileSync("/dev/stdin", "utf-8").trim();\nif(input) console.log(parseInt(input) * 2);\n' },
    { id: 'java', label: 'Java', judge0Id: 62, defaultCode: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(n * 2);\n    }\n}\n' },
    { id: 'cpp', label: 'C++', judge0Id: 54, defaultCode: '#include<iostream>\nusing namespace std;\n\nint main(){\n    int n;\n    cin >> n;\n    cout << n * 2 << endl;\n    return 0;\n}\n' },
    { id: 'c', label: 'C', judge0Id: 50, defaultCode: '#include<stdio.h>\n\nint main(){\n    int n;\n    scanf("%d", &n);\n    printf("%d\\n", n * 2);\n    return 0;\n}\n' },
];

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

const CodeEditor = ({ socket, roomId, username }) => {
    const [code, setCode] = useState(LANGUAGES[0].defaultCode);
    const [language, setLanguage] = useState(LANGUAGES[0]);
    const [shareMode, setShareMode] = useState('private'); // 'private' | 'view' | 'edit'
    const [testInput, setTestInput] = useState('5');
    const [output, setOutput] = useState(null); // { stdout, stderr, exitCode }
    const [isRunning, setIsRunning] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [sharedBy, setSharedBy] = useState(null);
    const editorRef = useRef(null);
    const codeRef = useRef(code);

    // Keep codeRef in sync
    useEffect(() => { codeRef.current = code; }, [code]);

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        // Someone shared/changed the code
        const onCodeUpdate = ({ code: newCode, language: lang, shareMode: mode, sharedBy: by }) => {
            if (lang) {
                const found = LANGUAGES.find(l => l.id === lang);
                if (found) setLanguage(found);
            }
            if (newCode !== undefined) setCode(newCode);
            if (mode) setShareMode(mode);
            if (by) setSharedBy(by);
        };

        // Someone is typing (live sync in 'edit' mode)
        const onCodeChange = ({ code: newCode }) => {
            setCode(newCode);
        };

        // Someone ran the code and is sharing results
        const onRunResult = (result) => {
            setOutput(result);
            setIsRunning(false);
        };

        socket.on('code_update', onCodeUpdate);
        socket.on('code_change', onCodeChange);
        socket.on('code_run_result', onRunResult);

        return () => {
            socket.off('code_update', onCodeUpdate);
            socket.off('code_change', onCodeChange);
            socket.off('code_run_result', onRunResult);
        };
    }, [socket]);

    const handleEditorChange = useCallback((value) => {
        setCode(value || '');
        // If in collaborative edit mode, broadcast each keystroke
        if (shareMode === 'edit') {
            socket?.emit('code_change', { roomId, code: value || '' });
        }
    }, [shareMode, socket, roomId]);

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        setCode(lang.defaultCode);
        setShowLangMenu(false);
        setOutput(null);
        if (shareMode !== 'private') {
            socket?.emit('code_update', {
                roomId,
                code: lang.defaultCode,
                language: lang.id,
                shareMode,
                sharedBy: username
            });
        }
    };

    const handleShareMode = (mode) => {
        setShareMode(mode);
        setSharedBy(username);
        socket?.emit('code_update', {
            roomId,
            code: codeRef.current,
            language: language.id,
            shareMode: mode,
            sharedBy: username
        });
    };

    const runCode = async () => {
        setIsRunning(true);
        setOutput(null);
        try {
            const resp = await fetch(JUDGE0_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_code: codeRef.current,
                    language_id: language.judge0Id,
                    stdin: testInput || ""
                })
            });
            const data = await resp.json();
            
            // Judge0 returns base64_encoded=false, so we get plain strings
            const isError = data.status?.id > 3; // Status > 3 Usually means compilation error, runtime error, etc
            const result = {
                stdout: data.stdout || '',
                stderr: data.compile_output || data.stderr || data.message || '',
                exitCode: isError ? 1 : 0,
                language: language.label
            };
            
            setOutput(result);
            setIsRunning(false);

            // If sharing, broadcast result to all
            if (shareMode !== 'private') {
                socket?.emit('code_run_result', { roomId, ...result });
            }
        } catch (err) {
            setOutput({ stdout: '', stderr: 'Network error: Could not reach the execution server.', exitCode: 1 });
            setIsRunning(false);
        }
    };

    const isReadOnly = shareMode === 'view' && sharedBy !== username;
    const canEdit = shareMode === 'private' || shareMode === 'edit' || sharedBy === username;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#e6edf3', fontFamily: "'Inter', sans-serif" }}>

            {/* ── Toolbar ── */}
            <div style={{ padding: '12px 16px', background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>

                {/* Language Selector */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowLangMenu(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                    >
                        <Code2 size={14} color="#58a6ff" />
                        {language.label}
                        <ChevronDown size={12} />
                    </button>
                    {showLangMenu && (
                        <div style={{ position: 'absolute', top: '110%', left: 0, background: '#161b22', border: '1px solid #30363d', borderRadius: '10px', overflow: 'hidden', zIndex: 100, minWidth: '140px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                            {LANGUAGES.map(l => (
                                <button
                                    key={l.id}
                                    onClick={() => handleLanguageChange(l)}
                                    style={{ display: 'block', width: '100%', padding: '10px 16px', background: l.id === language.id ? '#21262d' : 'transparent', color: l.id === language.id ? '#58a6ff' : '#e6edf3', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', fontWeight: l.id === language.id ? '700' : '400' }}
                                >
                                    {l.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Share Mode Buttons */}
                <div style={{ display: 'flex', background: '#21262d', borderRadius: '8px', border: '1px solid #30363d', overflow: 'hidden' }}>
                    {[
                        { mode: 'private', icon: <Lock size={13} />, label: 'Private' },
                        { mode: 'view',    icon: <Share2 size={13} />, label: 'Share' },
                        { mode: 'edit',    icon: <Users size={13} />, label: 'Edit' },
                    ].map(({ mode, icon, label }) => (
                        <button
                            key={mode}
                            onClick={() => handleShareMode(mode)}
                            title={label}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                                background: shareMode === mode ? (mode === 'edit' ? '#1f6feb' : mode === 'view' ? '#238636' : '#21262d') : 'transparent',
                                color: shareMode === mode ? '#fff' : '#8b949e',
                                transition: 'all 0.15s'
                            }}
                        >
                            {icon} {label}
                        </button>
                    ))}
                </div>

                {/* Status Badge */}
                {shareMode !== 'private' && sharedBy && (
                    <span style={{ fontSize: '11px', color: '#8b949e', background: '#21262d', padding: '4px 10px', borderRadius: '100px', border: '1px solid #30363d' }}>
                        {sharedBy === username ? '🟢 You are sharing' : `👁 ${sharedBy} is sharing`}
                    </span>
                )}

                {/* Run Button */}
                <button
                    onClick={runCode}
                    disabled={isRunning}
                    style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 18px', background: isRunning ? '#21262d' : '#238636', border: '1px solid #2ea043', color: 'white', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: isRunning ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                >
                    {isRunning ? <Loader2 size={15} className="spin" /> : <Play size={15} fill="white" />}
                    {isRunning ? 'Running...' : 'Run Code'}
                </button>
            </div>

            {/* ── Read-only Banner ── */}
            {isReadOnly && (
                <div style={{ padding: '8px 16px', background: 'rgba(31, 111, 235, 0.1)', borderBottom: '1px solid rgba(31, 111, 235, 0.3)', fontSize: '12px', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={12} /> You are viewing {sharedBy}'s code — read only. They can enable "Co-Edit" to let everyone type.
                </div>
            )}

            {/* ── Monaco Editor ── */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <Editor
                    height="100%"
                    language={language.id === 'cpp' ? 'cpp' : language.id}
                    value={code}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 16 },
                        readOnly: isReadOnly,
                        wordWrap: 'on',
                        lineNumbersMinChars: 3,
                        renderLineHighlight: 'line',
                        smoothScrolling: true,
                        cursorBlinking: 'expand',
                        fontLigatures: true,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    }}
                    onMount={(editor) => { editorRef.current = editor; }}
                />
            </div>

            {/* ── Test Input + Output ── */}
            <div style={{ background: '#161b22', borderTop: '1px solid #30363d', maxHeight: '220px', display: 'flex', flexDirection: 'column' }}>
                {/* Input row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: '1px solid #21262d' }}>
                    <Terminal size={14} color="#58a6ff" />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#8b949e', whiteSpace: 'nowrap' }}>STDIN / Test Input</span>
                    <input
                        value={testInput}
                        onChange={e => setTestInput(e.target.value)}
                        placeholder="Enter test input..."
                        style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', padding: '5px 10px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }}
                    />
                    {output && (
                        <button onClick={() => setOutput(null)} style={{ background: 'transparent', border: 'none', color: '#6e7681', cursor: 'pointer', padding: '4px' }}>
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>

                {/* Output */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                    {!output && !isRunning && (
                        <div style={{ color: '#6e7681', fontSize: '12px', fontStyle: 'italic' }}>
                            Press "Run Code" to execute and see output here.
                        </div>
                    )}
                    {isRunning && (
                        <div style={{ color: '#58a6ff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Loader2 size={14} className="spin" /> Executing on Piston runtime...
                        </div>
                    )}
                    {output && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {output.exitCode === 0
                                    ? <CheckCircle size={14} color="#3fb950" />
                                    : <XCircle size={14} color="#f85149" />
                                }
                                <span style={{ fontSize: '11px', fontWeight: '700', color: output.exitCode === 0 ? '#3fb950' : '#f85149' }}>
                                    {output.exitCode === 0 ? 'SUCCESS' : 'ERROR'} — {output.language}
                                </span>
                            </div>
                            {output.stdout && (
                                <pre style={{ background: '#0d1117', border: '1px solid #238636', borderRadius: '6px', padding: '10px', margin: 0, color: '#3fb950', fontSize: '13px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                    {output.stdout}
                                </pre>
                            )}
                            {output.stderr && (
                                <pre style={{ background: '#0d1117', border: '1px solid #f85149', borderRadius: '6px', padding: '10px', margin: 0, color: '#f85149', fontSize: '13px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                    {output.stderr}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default CodeEditor;
