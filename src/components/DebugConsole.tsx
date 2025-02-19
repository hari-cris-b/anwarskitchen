import React, { useState, useEffect } from 'react';
import { authLogger } from '../utils/authLogger';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogFilterProps {
  levels: LogLevel[];
  selectedLevel: LogLevel | 'all';
  onLevelChange: (level: LogLevel | 'all') => void;
}

const LogFilter: React.FC<LogFilterProps> = ({ levels, selectedLevel, onLevelChange }) => (
  <div className="flex gap-2 mb-4">
    <button
      onClick={() => onLevelChange('all')}
      className={`px-3 py-1 rounded text-sm ${
        selectedLevel === 'all'
          ? 'bg-gray-800 text-white'
          : 'bg-gray-200 hover:bg-gray-300'
      }`}
    >
      All
    </button>
    {levels.map(level => (
      <button
        key={level}
        onClick={() => onLevelChange(level)}
        className={`px-3 py-1 rounded text-sm ${
          selectedLevel === level
            ? 'bg-gray-800 text-white'
            : 'bg-gray-200 hover:bg-gray-300'
        }`}
      >
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </button>
    ))}
  </div>
);

interface DebugConsoleProps {
  position?: 'top-right' | 'bottom-right';
  defaultExpanded?: boolean;
}

const DebugConsole: React.FC<DebugConsoleProps> = ({
  position = 'bottom-right',
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [logs, setLogs] = useState(authLogger.getLogs());
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(authLogger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => 
    selectedLevel === 'all' || log.level === selectedLevel
  );

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4'
  }[position];

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div
      className={`fixed ${positionClasses} z-50 ${
        isExpanded ? 'w-96' : 'w-12'
      } transition-all duration-300`}
    >
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div
          className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className={`font-medium ${isExpanded ? '' : 'hidden'}`}>
            Debug Console
          </h3>
          <button className="p-1 hover:bg-gray-700 rounded">
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {isExpanded && (
          <div className="p-4">
            <LogFilter
              levels={['debug', 'info', 'warn', 'error']}
              selectedLevel={selectedLevel}
              onLevelChange={setSelectedLevel}
            />

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-sm font-mono whitespace-pre-wrap ${
                    {
                      debug: 'bg-gray-100',
                      info: 'bg-blue-50',
                      warn: 'bg-yellow-50',
                      error: 'bg-red-50'
                    }[log.level]
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`text-xs font-semibold ${
                      {
                        debug: 'text-gray-600',
                        info: 'text-blue-600',
                        warn: 'text-yellow-600',
                        error: 'text-red-600'
                      }[log.level]
                    }`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      [{log.component}]
                    </span>
                  </div>
                  <div className="text-gray-800">{log.message}</div>
                  {log.details && (
                    <pre className="mt-1 text-xs text-gray-600 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-between">
              <button
                onClick={() => authLogger.clearLogs()}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear Logs
              </button>
              <span className="text-sm text-gray-500">
                {filteredLogs.length} entries
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugConsole;