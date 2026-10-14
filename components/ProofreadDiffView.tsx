import React from 'react';
import DiffMatchPatch from 'diff-match-patch';
import { UI_STRINGS_MY } from '../constants';

interface ProofreadDiffViewProps {
  originalScript: string;
  proofreadScript: string;
}

// Define the type for a diff tuple for clarity: [operation, text]
// operation is -1 (delete), 1 (insert), or 0 (equal)
type Diff = [number, string];

const ProofreadDiffView: React.FC<ProofreadDiffViewProps> = ({ originalScript, proofreadScript }) => {
  // 1. Instantiate the diff-match-patch instance
  const dmp = new DiffMatchPatch();
  
  // 2. Generate the character-level diffs
  const diffs: Diff[] = dmp.diff_main(originalScript, proofreadScript);
  
  // 3. Apply semantic cleanup for better readability. This is the key enhancement.
  dmp.diff_cleanupSemantic(diffs);

  const renderDiff = (part: Diff, type: 'original' | 'proofread') => {
    const op = part[0];    // -1 for delete, 1 for insert, 0 for equal
    const text = part[1];

    let style = 'bg-transparent';
    let textDecoration = 'none';

    if (type === 'original' && op === -1) { // Text was removed
      style = 'bg-red-100 text-red-900';
      textDecoration = 'line-through';
    } else if (type === 'proofread' && op === 1) { // Text was added
      style = 'bg-green-100 text-green-900';
    } else if (op !== 0) {
      // Don't render added parts in the "Original" view, 
      // or removed parts in the "Edited" view.
      return null;
    }
    
    return (
      <span style={{ textDecoration }} className={`${style} transition-colors duration-200 rounded px-0.5`}>
        {text}
      </span>
    );
  };

  return (
    <div className="pt-6 border-t-2 border-indigo-400">
      <h2 className="font-serif text-3xl font-bold text-black mb-4 pb-2 border-b border-indigo-300">
        {UI_STRINGS_MY.PROOFREAD_COMPARISON_HEADING}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Original Script Column */}
        <div>
          <h3 className="font-serif text-xl font-semibold text-center text-black mb-3">{UI_STRINGS_MY.ORIGINAL_SCRIPT_LABEL}</h3>
          <div className="font-newspaper-body text-base text-black whitespace-pre-wrap p-4 bg-slate-50 border border-slate-200 rounded-md h-full">
            {diffs.map((part, index) => (
              <React.Fragment key={index}>
                {renderDiff(part, 'original')}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Proofread Script Column */}
        <div>
          <h3 className="font-serif text-xl font-semibold text-center text-black mb-3">{UI_STRINGS_MY.EDITED_SCRIPT_LABEL}</h3>
          <div className="font-newspaper-body text-base text-black whitespace-pre-wrap p-4 bg-indigo-50 border border-indigo-200 rounded-md h-full">
            {diffs.map((part, index) => (
              <React.Fragment key={index}>
                {renderDiff(part, 'proofread')}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProofreadDiffView;