import type { IAMExport } from '../context/AppContext';

interface PolicyViewerProps {
  policy: IAMExport;
}

// Minimal syntax highlighter: tokenize JSON string into spans
function highlightJSON(json: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Regex to match: string keys, string values, numbers, booleans, null, punctuation
  const tokenRegex = /("(?:[^"\\]|\\.)*")(\s*:\s*)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRegex.exec(json)) !== null) {
    // Add any whitespace/newlines between tokens as plain text
    if (match.index > lastIndex) {
      nodes.push(json.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // String token — key or value
      if (match[2] !== undefined) {
        // It's a key (followed by colon)
        nodes.push(<span key={key++} className="json-key">{match[1]}</span>);
        nodes.push(match[2]);
      } else {
        nodes.push(<span key={key++} className="json-string">{match[1]}</span>);
      }
    } else if (match[3] !== undefined) {
      nodes.push(<span key={key++} className="json-keyword">{match[3]}</span>);
    } else if (match[4] !== undefined) {
      nodes.push(<span key={key++} className="json-number">{match[4]}</span>);
    } else if (match[5] !== undefined) {
      nodes.push(<span key={key++} className="json-punct">{match[5]}</span>);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < json.length) {
    nodes.push(json.slice(lastIndex));
  }

  return nodes;
}

export default function PolicyViewer({ policy }: PolicyViewerProps) {
  const jsonString = JSON.stringify(policy, null, 2);
  const lines = jsonString.split('\n');

  return (
    <>
      <style>{`
        .policy-viewer {
          background: #1a1a2e;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #2d2d4e;
        }
        .policy-viewer__header {
          background: #12122a;
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          color: #8888aa;
          font-family: monospace;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #2d2d4e;
        }
        .policy-viewer__scroll {
          overflow-y: auto;
          max-height: 400px;
        }
        .policy-viewer__pre {
          margin: 0;
          padding: 1rem 0;
          font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
          font-size: 0.8rem;
          line-height: 1.6;
          color: #c9d1d9;
          overflow-x: auto;
        }
        .policy-viewer__line {
          display: flex;
          min-height: 1.6em;
        }
        .policy-viewer__line:hover {
          background: rgba(255,255,255,0.04);
        }
        .policy-viewer__lineno {
          user-select: none;
          min-width: 3rem;
          padding: 0 0.75rem;
          text-align: right;
          color: #444466;
          font-size: 0.75rem;
          flex-shrink: 0;
          border-right: 1px solid #2d2d4e;
          margin-right: 0.75rem;
        }
        .policy-viewer__code {
          white-space: pre;
          flex: 1;
        }
        .json-key    { color: #79c0ff; }
        .json-string { color: #a5d6ff; }
        .json-number { color: #f2cc60; }
        .json-keyword{ color: #ff7b72; }
        .json-punct  { color: #8b949e; }
      `}</style>
      <div className="policy-viewer" aria-label="IAM Policy JSON">
        <div className="policy-viewer__header">IAM Policy — JSON</div>
        <div className="policy-viewer__scroll">
          <pre className="policy-viewer__pre">
            <code>
              {lines.map((line, i) => (
                <div key={i} className="policy-viewer__line">
                  <span className="policy-viewer__lineno" aria-hidden="true">{i + 1}</span>
                  <span className="policy-viewer__code">{highlightJSON(line)}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </>
  );
}
