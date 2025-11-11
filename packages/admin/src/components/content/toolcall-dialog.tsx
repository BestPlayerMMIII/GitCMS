'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';

export interface ToolcallParameter {
  key: string;
  value: string;
}

export interface ToolcallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (id: string, parameters: ToolcallParameter[]) => void;
  onUpdate?: (id: string, parameters: ToolcallParameter[]) => void;
  editMode?: boolean;
  initialId?: string;
  initialParameters?: ToolcallParameter[];
}

export const ToolcallDialog: React.FC<ToolcallDialogProps> = ({
  isOpen,
  onClose,
  onInsert,
  onUpdate,
  editMode = false,
  initialId = '',
  initialParameters = [{ key: '', value: '' }],
}) => {
  const [toolcallId, setToolcallId] = useState('');
  const [parameters, setParameters] = useState<ToolcallParameter[]>([{ key: '', value: '' }]);

  // Update state when dialog opens in edit mode
  useEffect(() => {
    if (isOpen) {
      if (editMode && initialId) {
        setToolcallId(initialId);
        setParameters(initialParameters.length > 0 ? initialParameters : [{ key: '', value: '' }]);
      } else if (!editMode) {
        setToolcallId('');
        setParameters([{ key: '', value: '' }]);
      }
    }
  }, [isOpen, editMode, initialId, initialParameters]);

  const addParameter = () => {
    setParameters([...parameters, { key: '', value: '' }]);
  };

  const removeParameter = (index: number) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter((_, i) => i !== index));
    }
  };

  const updateParameter = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  const handleInsert = () => {
    if (!toolcallId.trim()) {
      alert('Please enter a Tool Call ID');
      return;
    }

    // Filter out empty parameters
    const validParams = parameters.filter(p => p.key.trim() !== '');

    if (editMode && onUpdate) {
      onUpdate(toolcallId.trim(), validParams);
    } else {
      onInsert(toolcallId.trim(), validParams);
    }

    // Reset form
    setToolcallId('');
    setParameters([{ key: '', value: '' }]);
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setToolcallId('');
    setParameters([{ key: '', value: '' }]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">
                ⚡
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {editMode ? 'Edit Tool Call' : 'Insert Tool Call'}
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {editMode
                    ? 'Update the tool call parameters'
                    : 'Create an interactive tool call with custom parameters'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-all"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Tool Call ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tool Call ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={toolcallId}
                onChange={e => setToolcallId(e.target.value)}
                placeholder="e.g., GOTO, BUTTON, CUSTOM_ACTION"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-mono"
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500">
                A unique identifier for this tool call (e.g., GOTO, BUTTON, SUBSCRIBE)
              </p>
            </div>

            {/* Parameters */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">Parameters</label>
                <button
                  type="button"
                  onClick={addParameter}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all font-medium"
                >
                  <Plus size={16} />
                  Add Parameter
                </button>
              </div>

              <div className="space-y-3">
                {parameters.map((param, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Key
                        </label>
                        <input
                          type="text"
                          value={param.key}
                          onChange={e => updateParameter(index, 'key', e.target.value)}
                          placeholder="parameter_name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Value
                        </label>
                        <input
                          type="text"
                          value={param.value}
                          onChange={e => updateParameter(index, 'value', e.target.value)}
                          placeholder="value"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParameter(index)}
                      disabled={parameters.length === 1}
                      className="mt-6 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      aria-label="Remove parameter"
                    >
                      <Minus size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Parameters are optional key-value pairs. Keys will be prefixed with &quot;_&quot; to
                avoid conflicts.
              </p>
            </div>

            {/* Preview */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Preview</label>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto">
                <code>
                  {'<gitcms-toolcall'}
                  {toolcallId && (
                    <>
                      {' '}
                      <span className="text-blue-400">id</span>=
                      <span className="text-yellow-400">&quot;{toolcallId}&quot;</span>
                    </>
                  )}
                  {parameters
                    .filter(p => p.key.trim() !== '')
                    .map((param, index) => (
                      <span key={index}>
                        {' '}
                        <span className="text-blue-400">_{param.key}</span>=
                        <span className="text-yellow-400">&quot;{param.value}&quot;</span>
                      </span>
                    ))}
                  {' />'}
                </code>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsert}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium shadow-sm"
            >
              {editMode ? 'Update Tool Call' : 'Insert Tool Call'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
